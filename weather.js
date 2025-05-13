const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;

const app = express();
const port = process.argv[2];

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.resolve(__dirname, "style")));

const weatherRouter = express.Router();

weatherRouter.get("/", (req, res) => {
  res.render("weatherForm");
});

weatherRouter.post("/", async (req, res) => {
  const place = req.body.place.trim();
  const apiUrl =
    `https://weather-api167.p.rapidapi.com/api/weather/current` +
    `?place=${encodeURIComponent(place)}&units=standard&lang=en&mode=json`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": "weather-api167.p.rapidapi.com",
      Accept: "application/json",
    },
  };

  let temperature;
  try {
    const apiRes = await fetch(apiUrl, options);
    const data = await apiRes.json();
    temperature = data.main.temprature;
  } catch (e) {
    console.error("Error:", e);
    return res.status(500).send("Invalid, could not retrieve weather data");
  }

  const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  const timestamp = new Date().toString();
  let retrieved;
  try {
    await client.connect();
    const res = client.db(databaseName).collection(collectionName);
    await res.insertOne({ place, temperature, date: timestamp });
    retrieved = await res.findOne({ date: timestamp });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await client.close();
  }

  res.render("weatherResult", {
    place,
    temperature: retrieved.temperature,
    date: timestamp,
  });
});

app.use("/weather", weatherRouter);

app.get("/", (req, res) => {
  res.redirect("/weather");
});

app.listen(port, () => {
  console.log(`Web server started and running at http://localhost:${port}`);
});
