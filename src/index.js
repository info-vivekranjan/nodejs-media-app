import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";

import connectDB from "./db/db.js";
import { app } from "./app.js";
const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is listening on PORT - ${PORT}`);
});
