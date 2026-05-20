import http from "http";

const email = "felipemenezes9272@gmail.com";
const password = "260892";

console.log("Sending actual HTTP request to http://localhost:3000/api/login...");

const postData = JSON.stringify({ email, password });

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  },
  (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });

    res.on("end", () => {
      console.log(`Body:`, body);
    });
  }
);

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
