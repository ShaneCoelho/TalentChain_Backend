const express = require("express");
const cors = require("cors");
const path = require("path");


const app = express()

const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())


//Connecting to backend
app.listen(port, () => {
  console.log(` backend listening at http://localhost:${port}`)
})