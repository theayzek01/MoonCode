import http from 'http';

http.get('http://127.0.0.1:59352/api/stream', (res) => {
  console.log("SSE connected:", res.statusCode);
  res.on('data', (chunk) => {
    console.log("SSE CHUNK:", chunk.toString());
  });
});
