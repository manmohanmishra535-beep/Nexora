
require("dotenv").config();

const key = process.env.CLERK_SECRET_KEY;

async function testClerkKey() {
    if (!key) {
        console.log("Secret key missing");
        return;
    }

    try {
        const response = await fetch(
            "https://api.clerk.com/v1/users?limit=1",
            {
                headers: {
                    Authorization: `Bearer ${key}`,
                },
            }
        );

        console.log("Clerk API status:", response.status);
        console.log(
            response.ok ? "KEY ACCEPTED" : "KEY REJECTED"
        );
    } catch (error) {
        console.log("Network error:", error.message);
    }
}

testClerkKey();
