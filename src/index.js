import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App.jsx";

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
module.hot.accept();
