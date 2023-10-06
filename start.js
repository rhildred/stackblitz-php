import App from './App.js';

const app = new App().app;

if(globalThis.server){
  await globalThis.server.close();
}

globalThis.server = app.listen(3001, () => {
  console.log(`Server is listening on port ${server.address().port}...`)  
}

);