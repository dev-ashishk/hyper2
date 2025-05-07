import { Context } from "@/core/context";
import { Http2App } from "@/core/app";

const { router, app } = new Http2App("Example-1");

router.get("/", async (ctx: Context) => {
  ctx.send({ message: "Welcome to Hyper2 HTTP/2 Framework!" }, 200);
});

router.group("/hello", () => {
  router.get("/:name", async (ctx: Context) => {
    const { name } = ctx.params;
    console.info("[GET /] recieved request");
    console.info(ctx.params);
    ctx.send({ message: `Hello, ${name}!` }, 200);
  });
});

router.post("/echo", async (ctx: Context) => {
  // Echo back whatever was sent in the request body
  ctx.send(
    {
      message: "Echo service",
      receivedData: ctx.req.body,
      timestamp: new Date().toISOString(),
    },
    200
  );
});

// Start the server
const PORT = 3000;
app.listen(PORT);
