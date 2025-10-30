/******************************************************************************
 ***
 * ITE5315 – Assignment 2
 * I declare that this assignment is my own work in accordance with Humber Academic Policy.
 * No part of this assignment has been copied manually or electronically from any other source
 * (including web sites) or distributed to other students.
 *
 * Name: Scarlett Jet Student ID: N01675129 Date: ____________________
 *
 *
 ******************************************************************************
 **/

// -------------------------------
// Import required modules
// -------------------------------
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { engine } from "express-handlebars";

// Required for ES modules (__dirname workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an Express app
const app = express();

// Set the port (default: 3000)
const port = process.env.PORT || 3000;

// -------------------------------
// Middleware to parse form data
// -------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -------------------------------
// Serve static files (CSS, images, JS)
// -------------------------------
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------
// Configure Handlebars view engine (with helpers)
// -------------------------------
app.engine(
  ".hbs",
  engine({
    extname: ".hbs",
    partialsDir: path.join(__dirname, "views/partials"),
    helpers: {
      // Custom helper to format price nicely
      formatPrice: (value) => {
        if (!value) return "N/A";
        const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
        return isNaN(num) ? value : `$${num.toLocaleString()}`;
      },
      // Uppercase helper
      toUpperCase: (str) => (str ? str.toUpperCase() : ""),
      // Step 10: Custom helper to replace empty names with "N/A"
      displayName: (name) => {
        if (!name || name.trim() === "") {
          return "N/A";
        }
        return name;
      },
      // Helper to check if name is empty (for highlighting)
      isEmptyName: (name) => {
        return !name || name.trim() === "";
      },
      // Step 11: Helper to check if price is in range
      priceInRange: (price, min, max) => {
        const numPrice = parseFloat(String(price).replace(/[^0-9.]/g, ""));
        const numMin = parseFloat(min);
        const numMax = parseFloat(max);
        return (
          !isNaN(numPrice) &&
          !isNaN(numMin) &&
          !isNaN(numMax) &&
          numPrice >= numMin &&
          numPrice <= numMax
        );
      },
    },
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// -------------------------------
// Load Airbnb data from JSON file
// -------------------------------
let airbnbData = [];

try {
  const rawData = fs.readFileSync(
    path.join(__dirname, "airbnb_data.json"),
    "utf8"
  );

  const jsonData = JSON.parse(rawData);

  // Normalize keys (replace spaces with underscores + lowercase)
  // Limit to 100 records for Vercel performance
  airbnbData = jsonData.slice(0, 100).map((item) => {
    const normalized = {};
    for (const key in item) {
      const cleanKey = key.trim().replace(/\s+/g, "_").toLowerCase();
      normalized[cleanKey] = item[key];
    }
    return normalized;
  });

  console.log("Airbnb JSON data loaded and normalized successfully!");
  console.log("Total records:", airbnbData.length);
  console.log("Sample record:", airbnbData[0]);
} catch (err) {
  console.error("Failed to load Airbnb JSON:", err.message);
  airbnbData = [];
}

// -------------------------------
// Routes
// -------------------------------

// Homepage
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to Express Handlebars" });
});

// About page
app.get("/about", (req, res) => {
  res.render("about", {
    title: "About Scarlett Jet",
    studentId: "N01675129",
    email: "N01675129@humber.ca",
  });
});

// -------------------------------------------------------
// View all Airbnb data (Paginated)
// -------------------------------------------------------
app.get("/allData", (req, res) => {
  const perPage = 25;
  const page = parseInt(req.query.page) || 1;

  if (!airbnbData.length) {
    return res.render("allData", {
      title: "All Airbnb Data",
      data: [],
      message: "No Airbnb data loaded yet.",
    });
  }

  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedData = airbnbData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(airbnbData.length / perPage);

  res.render("allData", {
    title: "All Airbnb Data",
    data: paginatedData,
    currentPage: page,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1,
  });
});

// -------------------------------------------------------
// View a single Airbnb record by its index
// -------------------------------------------------------
app.get("/allData/invoiceID/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (isNaN(index) || index < 0 || index >= airbnbData.length) {
    return res.status(404).render("error", {
      title: "Error",
      message: "Invalid record index.",
    });
  }

  const record = airbnbData[index];
  res.render("recordDetail", {
    title: "Listing Details",
    record,
  });
});

// -------------------------------------------------------
// Search by Property ID
// -------------------------------------------------------
app.get("/search/invoiceID", (req, res) => {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.render("searchByID", { title: "Search by Property ID" });
  }

  const result = airbnbData.find((item) => String(item.id ?? "").trim() === id);

  res.render("searchResult", {
    title: "Search Results by Property ID",
    result,
    id,
    backLink: "/search/invoiceID",
  });
});

// -------------------------------------------------------
// Search by Property Name (Paginated)
// -------------------------------------------------------
app.get("/search/produceLine", (req, res) => {
  const name = String(req.query.name || "")
    .toLowerCase()
    .trim();
  const perPage = 25;
  const page = parseInt(req.query.page) || 1;

  if (!name) {
    return res.render("searchByName", { title: "Search by Property Name" });
  }

  const results = airbnbData.filter((item) =>
    String(item.name || "")
      .toLowerCase()
      .includes(name)
  );

  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedResults = results.slice(startIndex, endIndex);
  const totalPages = Math.ceil(results.length / perPage);

  res.render("searchResult", {
    title: "Search Results by Property Name",
    results: paginatedResults,
    name,
    currentPage: page,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1,
    backLink: "/search/produceLine",
  });
});

// -------------------------------------------------------
// Step 8: View Airbnb data with Handlebars expressions/helpers
// -------------------------------------------------------
app.get("/viewData", (req, res) => {
  if (!airbnbData.length) {
    return res.render("viewData", {
      title: "View Airbnb Data (Detailed)",
      data: [],
      message: "No Airbnb data available.",
    });
  }

  res.render("viewData", {
    title: "All Airbnb Listings — Detailed View",
    data: airbnbData.slice(0, 100),
    totalRecords: airbnbData.length,
  });
});

// -------------------------------------------------------
// Step 9: Cleaned Airbnb data (filter using #if helper in template)
// -------------------------------------------------------
app.get("/viewData/clean", (req, res) => {
  if (!airbnbData.length) {
    return res.render("viewDataClean", {
      title: "Clean Airbnb Data — No Missing Names",
      data: [],
      message: "No Airbnb data available.",
    });
  }

  // Pass all data to template - filtering happens in template using {{#if}}
  // This demonstrates the use of Handlebars #if helper as requested in Step 9
  res.render("viewDataClean", {
    title: "Clean Airbnb Listings — No Empty Names",
    data: airbnbData.slice(0, 100),
    totalRecords: airbnbData.length,
  });
});

// -------------------------------------------------------
// Step 11: Search by Price Range
// -------------------------------------------------------
// Display form for price range search
app.get("/viewData/price", (req, res) => {
  res.render("priceRangeForm", {
    title: "Search by Price Range",
  });
});

// Handle price range search with validation and sanitization
app.post("/viewData/price", (req, res) => {
  // Sanitize inputs - remove any non-numeric characters except decimal point
  const minPriceInput = String(req.body.minPrice || "")
    .trim()
    .replace(/[^0-9.]/g, "");
  const maxPriceInput = String(req.body.maxPrice || "")
    .trim()
    .replace(/[^0-9.]/g, "");

  const minPrice = parseFloat(minPriceInput);
  const maxPrice = parseFloat(maxPriceInput);

  // Validation: Check if inputs are valid numbers
  if (isNaN(minPrice) || isNaN(maxPrice)) {
    return res.render("priceRangeForm", {
      title: "Search by Price Range",
      error:
        "Please enter valid numeric values for both minimum and maximum price.",
    });
  }

  // Validation: Check for negative values
  if (minPrice < 0 || maxPrice < 0) {
    return res.render("priceRangeForm", {
      title: "Search by Price Range",
      error:
        "Price values must be positive numbers (greater than or equal to 0).",
    });
  }

  // Validation: Check if min is greater than max
  if (minPrice > maxPrice) {
    return res.render("priceRangeForm", {
      title: "Search by Price Range",
      error: "Minimum price cannot be greater than maximum price.",
    });
  }

  // Filter data by price range (server-side filtering)
  const results = airbnbData.filter((item) => {
    const price = parseFloat(String(item.price || "").replace(/[^0-9.]/g, ""));
    return !isNaN(price) && price >= minPrice && price <= maxPrice;
  });

  console.log(
    `Found ${results.length} listings between $${minPrice} and $${maxPrice}`
  );

  // Render results
  res.render("priceRangeResults", {
    title: "Price Range Search Results",
    results: results.slice(0, 100), // Limit to 100 records
    minPrice,
    maxPrice,
    totalResults: results.length,
  });
});

// -------------------------------------------------------
// 404 - Catch all unmatched routes
// -------------------------------------------------------
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Error",
    message: "Page not found — Wrong Route",
  });
});

// -------------------------------
// Start the Server
// -------------------------------
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Total records loaded: ${airbnbData.length}`);
});
