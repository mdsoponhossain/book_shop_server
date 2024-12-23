const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://boi-ghor-827b2.web.app"],
    credentials: true,
  })
);
app.use(express.json());

// token verification:
const verifyJWT = (req, res, next) => {
  const authorization = req?.headers?.authorization;
  if (!authorization) {
    return res.send({ message: "No token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (error, decoded) => {
    if (error) {
      return res.send({ message: "Invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};

// verify seller:

const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "seller") {
    return req.send({ message: "Forbidden Access" });
  }
  next();
};

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3g7cuab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// database & collection :
const userCollection = client.db("bookShop_DB").collection("users_collection");
const newBooksCollection = client
  .db("bookShop_DB")
  .collection("newBooks_collection");
const productCollection = client
  .db("bookShop_DB")
  .collection("books_collection");

const dbConnect = async () => {
  try {
    await client.connect();
    console.log("Database connected successfully");

    // find a user:
    app.get("/user/:email", async (req, res) => {
      const query = { email: req?.params?.email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });
    // find new book collection:
    app.get("/new-books", async (req, res) => {
      const result = await newBooksCollection.find().toArray();
      res.send(result);
    });

    // get all users:
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      const users = await result?.filter((user) => user.role !== "admin");
      res.send(users);
    });

    // delete a  users:
    app.delete("/users/:id", async (req, res) => {
      const result = await userCollection.deleteOne({
        _id: new ObjectId(req?.params?.id),
      });
      res.send(result);
    });

    // update a users:
    app.patch("/users/:id", async (req, res) => {
      const updateDoc = {
        $set: {
          role: req?.body?.role,
        },
      };
      const filter = { _id: new ObjectId(req?.params?.id) };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // insert user:

    app.post("/user", async (req, res) => {
      const user = req?.body;
      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // add product:
    app.post("/add-product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // add product:
    app.patch("/update-product/:id", async (req, res) => {
      const product = req.body;
      console.log(product);
      const result = await productCollection.updateOne(
        {
          _id: new ObjectId(req?.params?.id),
        },
        {
          $set: {
            ...product,
          },
        }
      );
      res.send(result);
    });

    // get a book:
    app.get("/books/book/:id", async (req, res) => {
      console.log("a single:book", req?.params);
      const result = await productCollection.findOne({
        _id: new ObjectId(req?.params?.id),
      });
      res.send(result);
    });

    // get a book:
    app.delete("/books/delete/:id", async (req, res) => {
      const result = await productCollection.deleteOne({
        _id: new ObjectId(req?.params?.id),
      });
      res.json(result);
    });

    // get books for seller:
    app.get("/books/:email", async (req, res) => {
      const result = await productCollection
        .find({
          sellerEmail: req?.params?.email,
        })
        .toArray();
      res.send(result);
    });

    // get product:
    app.get("/books", async (req, res) => {
      const { name, sort, category, brand, page = 1, limit = 6 } = req.query;
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const query = {};
      if (name) {
        query.name = { $regex: name, $options: "i" };
      }
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }
      if (brand) {
        query.brand = brand;
      }
      const sortOption = sort === "asc" ? 1 : -1;
      const products = await productCollection
        .find(query)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .sort({ price: sortOption })
        .toArray();
      const totalProducts = await productCollection.countDocuments();
      const brands = [...new Set(products.map((product) => product.brand))];
      const categories = [
        ...new Set(products.map((product) => product.category)),
      ];
      res.json({ totalProducts, brands, categories, products });
    });
  } catch (error) {
    console.log(error?.name, error?.message);
  }
};
dbConnect();

// api
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// jwt
app.post("/authentication", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  res.send({ token });
});

app.listen(port, () => {
  console.log(`Server is running on ${port} ...`);
});
