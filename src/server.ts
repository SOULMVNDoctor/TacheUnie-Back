import app from "./app";

app.listen(process.env.PORT || 4000, () => {
  console.log("API démarrée sur http://localhost:" + (process.env.PORT || 4000));
});
