require("dotenv").config();
const ConnectionDB = require("./database");
const express = require("express");
const cors = require("cors");
const path = require("path");
require('./models/Users');
require('./models/Campaigns');
ConnectionDB();


const app = express()

const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.use("/api/auth", require("./routes/auth"))
app.use("/api/freelancer", require("./routes/freelancer/profile"))
app.use("/api/freelancer", require("./routes/freelancer/campaign"))
app.use("/api/startup", require("./routes/startup/profile"))
app.use("/api/startup", require("./routes/startup/campaign"))

//Connecting to backend
app.listen(port, () => {
  console.log(` backend listening at http://localhost:${port}`)
})