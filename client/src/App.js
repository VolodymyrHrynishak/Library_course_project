import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import BookList from "./components/BookList";
import AdminPanel from "./components/AdminPanel";
import Login from "./components/Login";
import Register from "./components/Register";
import AddBook from "./components/AddBook";
import HomePage from "./components/HomePage";
import BookDetails from "./components/BookDetails"; // Переконайтеся, що ім'я файлу співпадає
import { ThemeProvider } from "./context/ThemeContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/theme.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book-list" element={<BookList />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/login" element={<Login />} />
            <Route path="/add-book" element={<AddBook />} />
            <Route path="/register" element={<Register />} />
            <Route path="/book/:id" element={<BookDetails />} />{" "}
            {/* Виправлений маршрут */}
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
