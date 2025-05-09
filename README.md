# Distributed Voting Backend (JWT-Protected)

This is a minimal FastAPI-based backend for a voting system using JWT for authentication.

## Features

- Login with dummy credentials
- Get a JWT token
- Submit a vote using the token

## Run Instructions

1. Install dependencies:

````bash
pip install -r requirements.txt

#Start the server:

uvicorn main:app --reload
#
#test the login and vote

 .\test_login_vote.ps1

## API Gateway Architecture (IMPORTANT)

- **All frontend and test scripts must use the API Gateway at `http://localhost:8000` for all API calls.**
- **Do NOT attempt to call voting nodes directly (e.g., `localhost:5001`, `localhost:5002`, etc.) from the host or frontend.**
- **The API Gateway forwards requests to the distributed voting nodes using Docker-internal hostnames (e.g., `voting-node-1:5000`).**
- **Voting nodes are only accessible from within the Docker network, not from the host.**

### Example

- To create an election, POST to `http://localhost:8000/elections`
- To vote, POST to `http://localhost:8000/vote`
- To get results, GET `http://localhost:8000/results`

**If you run test scripts or use the frontend, always use the API Gateway URL.**

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
````

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
