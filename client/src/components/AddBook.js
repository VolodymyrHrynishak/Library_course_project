import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddBook() {
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    description: "",
    year: "",
    category: "", // Додано поле категорії
    cover: null,
    bookFile: null,
  });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Список доступних категорій
  const categories = [
    "Художня література",
    "Фантастика",
    "Детективи",
    "Роман",
    "Поезія",
    "Історична проза",
    "Бізнес",
    "Наука",
    "Технології",
    "Психологія",
    "Філософія",
    "Інше",
  ];

  const handleChange = (e) => {
    setBookData({
      ...bookData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (e.target.name === "cover") {
        setBookData({ ...bookData, cover: file });

        // Створення прев'ю зображення
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (e.target.name === "bookFile") {
        setBookData({ ...bookData, bookFile: file });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bookData.title || !bookData.author) {
      setError("Назва та автор обов'язкові");
      return;
    }

    const formData = new FormData();
    formData.append("title", bookData.title);
    formData.append("author", bookData.author);
    formData.append("description", bookData.description);
    formData.append("year", bookData.year);
    formData.append("category", bookData.category); // Додаємо категорію
    if (bookData.cover) {
      formData.append("cover", bookData.cover);
    }
    if (bookData.bookFile) {
      formData.append("bookFile", bookData.bookFile);
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/api/books", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Помилка додавання книги");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Додати нову книгу</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Назва книги*</label>
          <input
            type="text"
            name="title"
            className="form-control"
            value={bookData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Автор*</label>
          <input
            type="text"
            name="author"
            className="form-control"
            value={bookData.author}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Рік публікації</label>
          <input
            type="number"
            name="year"
            className="form-control"
            value={bookData.year}
            onChange={handleChange}
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Категорія</label>
          <select
            name="category"
            className="form-select"
            value={bookData.category}
            onChange={handleChange}
          >
            <option value="">Оберіть категорію</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Опис</label>
          <textarea
            name="description"
            className="form-control"
            rows="4"
            value={bookData.description}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Обкладинка</label>
          <input
            type="file"
            name="cover"
            className="form-control"
            accept="image/*"
            onChange={handleFileChange}
          />
          {preview && (
            <div className="mt-2">
              <img
                src={preview}
                alt="Попередній перегляд"
                style={{ maxWidth: "200px", maxHeight: "300px" }}
              />
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Файл книги (PDF)</label>
          <input
            type="file"
            name="bookFile"
            className="form-control"
            accept=".pdf"
            onChange={handleFileChange}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Додати книгу
        </button>
      </form>
    </div>
  );
}

export default AddBook;
