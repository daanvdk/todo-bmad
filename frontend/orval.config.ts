export default {
  "todo-api": {
    input: process.env.OPENAPI_PATH ?? "http://localhost/api/openapi.json",
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      client: "react-query",
      baseUrl: "/api",
    },
  },
};
