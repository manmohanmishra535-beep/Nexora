const { z } = require("zod");

const objectId = z
    .string()
    .regex(/^[a-f\d]{24}$/i, "This id is not valid.");

const username = z
    .string()
    .trim()
    .toLowerCase()
    .regex(
        /^[a-z0-9_]{3,15}$/,
        "Use 3 to 15 letters, numbers or underscores."
    );

const paginationQuery = z
    .object({
        limit: z
            .string()
            .regex(/^\d+$/, "Limit must be a number.")
            .optional(),
        cursor: z
            .string()
            .regex(/^[a-f\d]{24}$/i, "This cursor is not valid.")
            .optional(),
    })
    .passthrough();

const content = z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(280, "Posts can be at most 280 characters.");

const optionalContent = z
    .string()
    .trim()
    .max(280, "Posts can be at most 280 characters.")
    .optional()
    .default("");

const schemas = {
    paginationQuery,

    createPost: z.object({
        content: optionalContent,
    }),

    updatePost: z.object({
        content,
    }),

    createComment: z.object({
        content: z
            .string()
            .trim()
            .min(1, "Write a comment first.")
            .max(280, "Comments can be at most 280 characters."),
    }),

    updateProfile: z.object({
        displayName: z
            .string()
            .trim()
            .max(50, "Display names can be at most 50 characters.")
            .optional(),
        username: username.optional(),
        bio: z
            .string()
            .trim()
            .max(160, "Bios can be at most 160 characters.")
            .optional(),
    }),

    search: z.object({
        q: z
            .string()
            .trim()
            .min(1, "Type something to search.")
            .max(50, "Search terms can be at most 50 characters."),
    }),

    idParam: z.object({ id: objectId }),

    usernameParam: z.object({ username }),

    createConversation: z.object({
        userId: objectId,
    }),

    sendMessage: z.object({
        text: z
            .string()
            .trim()
            .min(1, "Write a message first.")
            .max(1000, "Messages can be at most 1000 characters."),
    }),
};

module.exports = schemas;
