/**
 * Nexora API integration suite. See docs/ALIGNMENT.md for scope.
 *
 * Needs network access: Clerk mints the session tokens and MongoDB Atlas
 * hosts the isolated `nexora_test` database (dropped in afterAll).
 */
const fs = require("node:fs");
const path = require("node:path");

const request = require("supertest");

const {
    USER_A,
    USER_B,
    mintToken,
    connectTestDB,
    dropTestDB,
} = require("./helpers");

const app = require("../src/server");

// 1x1 transparent PNG.
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

let tokenA;
let tokenB;

const createPost = async (token, content) => {
    const response = await request(app)
        .post("/api/posts")
        .set(auth(token))
        .field("content", content);

    if (response.status !== 201) {
        throw new Error(
            `post create failed: ${response.status} ${JSON.stringify(response.body)}`
        );
    }

    return response.body.post;
};

beforeAll(async () => {
    await connectTestDB();
    tokenA = await mintToken(USER_A);
    tokenB = await mintToken(USER_B);
});

afterAll(async () => {
    await dropTestDB();
});

describe("API index and health", () => {
    test("GET /api describes the service", async () => {
        const response = await request(app).get("/api");

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Nexora API");
        expect(response.body.endpoints.health).toBe("/api/health");
    });

    test("GET /api/health reports the database", async () => {
        const response = await request(app).get("/api/health");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ status: "ok", db: "connected" });
    });
});

describe("authentication", () => {
    test("rejects requests without a token", async () => {
        const response = await request(app).get("/api/users/me");

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("UNAUTHENTICATED");
    });

    test("rejects a garbage token", async () => {
        const response = await request(app)
            .get("/api/users/me")
            .set(auth("not-a-real-token"));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("UNAUTHENTICATED");
    });

    test("returns the signed-in profile", async () => {
        const response = await request(app)
            .get("/api/users/me")
            .set(auth(await mintToken(USER_A)));

        expect(response.status).toBe(200);
        // The test database upserts from Clerk, so assert on Clerk-owned
        // fields (the dev database carries a legacy longer username).
        expect(response.body.user.email).toBe("manmohanmishra535@gmail.com");
        expect(response.body.user.isMe).toBe(true);
    });

    test("returns a different account for another token", async () => {
        const response = await request(app)
            .get("/api/users/me")
            .set(auth(await mintToken(USER_B)));

        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe("mishra695");
    });
});

describe("posts: creation, validation and editing", () => {
    let post;

    test("creates a text post", async () => {
        const response = await request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "first test post");

        expect(response.status).toBe(201);

        post = response.body.post;
        expect(post.content).toBe("first test post");
        expect(post.likeCount).toBe(0);
        expect(post.likedByMe).toBe(false);
        expect(post.author.isMe).toBe(true);
    });

    test("rejects an empty post", async () => {
        const response = await request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "");

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe("VALIDATION_FAILED");
        expect(response.body.error.fields.content).toBeTruthy();
    });

    test("rejects content over 280 characters", async () => {
        const response = await request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "x".repeat(281));

        expect(response.status).toBe(422);
        expect(response.body.error.fields.content).toBeTruthy();
    });

    test("requires auth to post", async () => {
        const response = await request(app)
            .post("/api/posts")
            .field("content", "nope");

        expect(response.status).toBe(401);
    });

    test("reads a post back", async () => {
        const response = await request(app).get(`/api/posts/${post._id}`);

        expect(response.status).toBe(200);
        expect(response.body.post._id).toBe(post._id);
    });

    test("rejects a malformed id", async () => {
        const response = await request(app).get("/api/posts/not-an-id");

        expect(response.status).toBe(422);
        expect(response.body.error.fields.id).toBeTruthy();
    });

    test("404s for an unknown id", async () => {
        const response = await request(app).get(
            "/api/posts/aaaaaaaaaaaaaaaaaaaaaaaa"
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("lets the author edit", async () => {
        const response = await request(app)
            .patch(`/api/posts/${post._id}`)
            .set(auth(tokenA))
            .send({ content: "first test post (edited)" });

        expect(response.status).toBe(200);
        expect(response.body.post.content).toBe("first test post (edited)");
        expect(response.body.post.editedAt).toBeTruthy();
    });

    test("blocks edits from another account", async () => {
        const response = await request(app)
            .patch(`/api/posts/${post._id}`)
            .set(auth(tokenB))
            .send({ content: "hijack" });

        expect(response.status).toBe(403);
    });

    test("blocks deletion by another account", async () => {
        const response = await request(app)
            .delete(`/api/posts/${post._id}`)
            .set(auth(tokenB));

        expect(response.status).toBe(403);
    });

    test("deletes the post for its author", async () => {
        const deleted = await request(app)
            .delete(`/api/posts/${post._id}`)
            .set(auth(tokenA));

        expect(deleted.status).toBe(204);

        const gone = await request(app).get(`/api/posts/${post._id}`);
        expect(gone.status).toBe(404);
    });
});

// Regression guards: the client once sent the opposite HTTP verb for these
// three actions, so the server contract must stay explicit.
describe("like, repost and bookmark verbs", () => {
    let post;

    beforeAll(async () => {
        post = await createPost(tokenA, "interaction contract post");
    });

    test("likes are idempotent in both directions", async () => {
        const on = await request(app)
            .post(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));
        expect(on.status).toBe(200);
        expect(on.body).toEqual({ liked: true, likeCount: 1 });

        const onAgain = await request(app)
            .post(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));
        expect(onAgain.status).toBe(200);
        expect(onAgain.body).toEqual({ liked: true, likeCount: 1 });

        const off = await request(app)
            .delete(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));
        expect(off.status).toBe(200);
        expect(off.body).toEqual({ liked: false, likeCount: 0 });

        const offAgain = await request(app)
            .delete(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));
        expect(offAgain.status).toBe(200);
        expect(offAgain.body).toEqual({ liked: false, likeCount: 0 });
    });

    test("the viewer flag follows the like state", async () => {
        await request(app)
            .post(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));

        const viewed = await request(app)
            .get(`/api/posts/${post._id}`)
            .set(auth(tokenA));

        expect(viewed.body.post.likedByMe).toBe(true);
        expect(viewed.body.post.likeCount).toBe(1);

        await request(app)
            .delete(`/api/posts/${post._id}/like`)
            .set(auth(tokenA));
    });

    test("liking a missing post is a 404", async () => {
        const response = await request(app)
            .post("/api/posts/aaaaaaaaaaaaaaaaaaaaaaaa/like")
            .set(auth(tokenA));

        expect(response.status).toBe(404);
    });

    test("bookmarks are idempotent and listed per viewer", async () => {
        const on = await request(app)
            .post(`/api/posts/${post._id}/bookmark`)
            .set(auth(tokenA));
        expect(on.status).toBe(200);
        expect(on.body).toEqual({ bookmarked: true });

        const listed = await request(app)
            .get("/api/posts/bookmarks")
            .set(auth(tokenA));
        expect(listed.status).toBe(200);
        expect(
            listed.body.items.some((item) => item._id === post._id)
        ).toBe(true);

        const off = await request(app)
            .delete(`/api/posts/${post._id}/bookmark`)
            .set(auth(tokenA));
        expect(off.status).toBe(200);
        expect(off.body).toEqual({ bookmarked: false });

        const offAgain = await request(app)
            .delete(`/api/posts/${post._id}/bookmark`)
            .set(auth(tokenA));
        expect(offAgain.status).toBe(200);
        expect(offAgain.body).toEqual({ bookmarked: false });

        const after = await request(app)
            .get("/api/posts/bookmarks")
            .set(auth(tokenA));
        expect(
            after.body.items.some((item) => item._id === post._id)
        ).toBe(false);
    });

    test("reposts can be created once and removed", async () => {
        const on = await request(app)
            .post(`/api/posts/${post._id}/repost`)
            .set(auth(tokenA));
        expect(on.status).toBe(201);
        expect(on.body.post.repostOf._id).toBe(post._id);

        const duplicate = await request(app)
            .post(`/api/posts/${post._id}/repost`)
            .set(auth(tokenA));
        expect(duplicate.status).toBe(409);

        const viewed = await request(app)
            .get(`/api/posts/${post._id}`)
            .set(auth(tokenA));
        expect(viewed.body.post.repostedByMe).toBe(true);
        expect(viewed.body.post.repostCount).toBe(1);

        // The original rendered inside the repost wrapper carries the flag too.
        const feed = await request(app)
            .get("/api/posts/feed")
            .set(auth(tokenA));
        const wrapper = feed.body.items.find(
            (item) => item.repostOf && item.repostOf._id === post._id
        );
        expect(wrapper).toBeTruthy();
        expect(wrapper.repostOf.repostedByMe).toBe(true);

        const off = await request(app)
            .delete(`/api/posts/${post._id}/repost`)
            .set(auth(tokenA));
        expect(off.status).toBe(204);

        const after = await request(app)
            .get(`/api/posts/${post._id}`)
            .set(auth(tokenA));
        expect(after.body.post.repostedByMe).toBe(false);
        expect(after.body.post.repostCount).toBe(0);

        const offAgain = await request(app)
            .delete(`/api/posts/${post._id}/repost`)
            .set(auth(tokenA));
        expect(offAgain.status).toBe(404);
    });
});

describe("feed and pagination", () => {
    let oldestId;

    beforeAll(async () => {
        const first = await createPost(tokenA, "page seed 1");
        await createPost(tokenA, "page seed 2");
        await createPost(tokenA, "page seed 3");
        oldestId = first._id;
    });

    test("pages through explore with a cursor", async () => {
        const page1 = await request(app)
            .get("/api/posts/explore?limit=2")
            .set(auth(tokenA));

        expect(page1.status).toBe(200);
        expect(page1.body.items).toHaveLength(2);
        expect(page1.body.nextCursor).toBeTruthy();

        const page2 = await request(app).get(
            `/api/posts/explore?limit=2&cursor=${page1.body.nextCursor}`
        );

        expect(page2.status).toBe(200);
        expect(page2.body.items.length).toBeGreaterThan(0);

        const page1Ids = page1.body.items.map((item) => item._id);
        const page2Ids = page2.body.items.map((item) => item._id);
        expect(page2Ids.filter((id) => page1Ids.includes(id))).toHaveLength(0);
    });

    test("rejects a malformed cursor", async () => {
        const response = await request(app).get(
            "/api/posts/explore?cursor=nope"
        );

        expect(response.status).toBe(422);
        expect(response.body.error.fields.cursor).toBeTruthy();
    });

    test("the home feed includes the viewer's own posts", async () => {
        const response = await request(app)
            .get("/api/posts/feed")
            .set(auth(tokenA));

        expect(response.status).toBe(200);
        expect(
            response.body.items.some((item) => item._id === oldestId)
        ).toBe(true);
    });
});

describe("comments", () => {
    let post;

    beforeAll(async () => {
        post = await createPost(tokenA, "comment target");
    });

    test("creates and lists comments, and counts them on the post", async () => {
        const created = await request(app)
            .post(`/api/posts/${post._id}/comments`)
            .set(auth(tokenA))
            .send({ content: "nice post" });

        expect(created.status).toBe(201);
        expect(created.body.comment.content).toBe("nice post");

        const listed = await request(app).get(
            `/api/posts/${post._id}/comments`
        );
        expect(listed.status).toBe(200);
        expect(
            listed.body.items.some((item) => item.content === "nice post")
        ).toBe(true);

        const viewed = await request(app).get(`/api/posts/${post._id}`);
        expect(viewed.body.post.commentCount).toBe(1);
    });

    test("rejects an empty comment", async () => {
        const response = await request(app)
            .post(`/api/posts/${post._id}/comments`)
            .set(auth(tokenA))
            .send({ content: "" });

        expect(response.status).toBe(422);
        expect(response.body.error.fields.content).toBeTruthy();
    });
});

// The workspace has no valid Cloudinary secret, so these tests document the
// local-disk fallback: store under backend/uploads, serve at /uploads,
// delete the file with the post.
describe("image uploads (local fallback)", () => {
    let post;
    let onDisk;
    let uploadPath;

    const localPath = (publicId) => publicId.slice("local:".length);

    afterAll(() => {
        // Insurance: never leave an orphan file behind if an assertion failed.
        if (onDisk && fs.existsSync(onDisk)) {
            fs.unlinkSync(onDisk);
        }
    });

    test("stores an image and serves it from /uploads", async () => {
        const response = await request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "image post")
            .attach("images", PNG, "test.png");

        expect(response.status).toBe(201);

        post = response.body.post;
        const image = post.images[0];

        expect(image.publicId.startsWith("local:nexora/posts/")).toBe(true);
        expect(image.url).toContain(`/uploads/${localPath(image.publicId)}`);
        expect(image.url.endsWith(".png")).toBe(true);

        onDisk = path.join(__dirname, "..", "uploads", localPath(image.publicId));
        expect(fs.existsSync(onDisk)).toBe(true);

        uploadPath = new URL(image.url).pathname;

        const served = await request(app).get(uploadPath);
        expect(served.status).toBe(200);
        expect(served.headers["content-type"]).toContain("image/png");
        expect(served.headers["cross-origin-resource-policy"]).toBe(
            "cross-origin"
        );
        expect(Number(served.headers["content-length"])).toBe(PNG.length);
    });

    test("deleting the post removes the stored file", async () => {
        const deleted = await request(app)
            .delete(`/api/posts/${post._id}`)
            .set(auth(tokenA));

        expect(deleted.status).toBe(204);
        expect(fs.existsSync(onDisk)).toBe(false);

        const gone = await request(app).get(uploadPath);
        expect(gone.status).toBe(404);
    });

    test("rejects a non-image file", async () => {
        const response = await request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "bad file")
            .attach("images", Buffer.from("hello"), {
                filename: "notes.txt",
                contentType: "text/plain",
            });

        expect(response.status).toBe(422);
        expect(response.body.error.fields.images).toBeTruthy();
    });

    test("rejects more than four images", async () => {
        const pending = request(app)
            .post("/api/posts")
            .set(auth(tokenA))
            .field("content", "too many images");

        for (let index = 0; index < 5; index += 1) {
            pending.attach("images", PNG, `img${index}.png`);
        }

        const response = await pending;

        expect(response.status).toBe(422);
        expect(response.body.error.fields.images).toContain("4");
    });
});
