import http from "http";

async function run() {
    const req = http.request("http://127.0.0.1:3000/api/history", { method: "GET" }, res => {
        let body = "";
        res.on("data", c => body += c);
        res.on("end", () => {
            console.log(JSON.parse(body));
        });
    });
    req.end();
}
run();
