import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "tracker",
  password: "root",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];
let userIndex = 0

async function updateUsers(){
  let users = [];
  const user_list = await db.query("SELECT * FROM users ORDER BY id ASC");
  user_list.rows.forEach((user) =>{
  users.push(user);
})
  return users;
}

async function checkVisisted() {
  const visited = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  visited.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  //let set = new Set(countries)
  //countries = [...set]
  //console.log(countries);
  return countries;
}

async function searchUser(id){
  for (let i = 0; i <= users.length; i++){
    if(id == users[i].id){
      return i;
    }
  }
}

users = await updateUsers();

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[userIndex].color
  });
});


app.post("/add", async (req, res) =>{
  const input = req.body["country"];
  try{
      const code = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'", [input.toLowerCase()]);
      const countryCode = code.rows[0].country_code;
      try{
        //console.log(countryCode, currentUserId, userIndex, users);
        await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",[countryCode, currentUserId]);
        res.redirect("/");
      }catch (err){
        res.redirect("/");
      }
  }catch (err){
    res.redirect("/");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    const id = req.body["user"];
    currentUserId = id;
    userIndex = await searchUser(id);
    res.redirect("/");
  }
});
  

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );
  users = await updateUsers();
  const id = result.rows[0].id;
  currentUserId = id;
  userIndex = await searchUser(id)
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
