const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  return res.send('Hello bitovi');
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});
