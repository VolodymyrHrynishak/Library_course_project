import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Rating } from "react-simple-star-rating";

function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  const validateToken = useCallback((token) => {
    if (!token) return false;

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.exp * 1000 > Date.now();
    } catch (e) {
      console.error("Помилка декодування токена:", e);
      return false;
    }
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      setCommentError("");

      const response = await axios.get(
        `http://localhost:5000/api/books/${id}/comments`
      );

      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Помилка завантаження коментарів:", err);
      setCommentError(
        err.response?.data?.error || "Не вдалося завантажити коментарі"
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  const fetchBook = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const config =
        token && validateToken(token)
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          : {};

      const response = await axios.get(
        `http://localhost:5000/api/books/${id}`,
        config
      );

      if (!response.data) {
        throw new Error("Дані про книгу не отримано");
      }

      setBook(response.data);
      setAverageRating(parseFloat(response.data.avg_rating) || 0);
      setUserRating(parseInt(response.data.user_rating) || 0);
      setRatingsCount(parseInt(response.data.ratings_count) || 0);

      await fetchComments();
    } catch (err) {
      console.error("Помилка завантаження книги:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        setError("Ваша сесія закінчилася. Будь ласка, увійдіть знову.");
      } else {
        setError(
          err.response?.data?.message ||
            "Не вдалося завантажити інформацію про книгу"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, validateToken, fetchComments]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const handleRating = async (rate) => {
    try {
      setRatingLoading(true);
      setError("");

      const rating = Math.round(rate);
      if (rating < 1 || rating > 5) {
        throw new Error("Будь ласка, оберіть рейтинг від 1 до 5");
      }

      const token = localStorage.getItem("token");
      if (!token || !validateToken(token)) {
        navigate("/login", {
          state: {
            from: `/books/${id}`,
            message: "Будь ласка, увійдіть, щоб оцінити книгу",
          },
        });
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/books/${id}/rate`,
        { rating: rating },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      setUserRating(rating);
      setAverageRating(response.data.averageRating);
      setRatingsCount(response.data.ratingsCount);
    } catch (err) {
      console.error("Помилка при оцінюванні:", err);
      setError(err.response?.data?.error || "Не вдалося оцінити книгу");
    } finally {
      setRatingLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    try {
      setCommentError("");

      const token = localStorage.getItem("token");
      if (!token || !validateToken(token)) {
        navigate("/login", {
          state: {
            from: `/books/${id}`,
            message: "Будь ласка, увійдіть, щоб залишити коментар",
          },
        });
        return;
      }

      if (!newComment.trim()) {
        throw new Error("Коментар не може бути порожнім");
      }

      await axios.post(
        `http://localhost:5000/api/books/${id}/comments`,
        {
          text: newComment,
          rating: commentRating > 0 ? commentRating : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setNewComment("");
      setCommentRating(0);
      await fetchComments();
    } catch (err) {
      console.error("Помилка додавання коментаря:", err);
      setCommentError(
        err.response?.data?.error || err.message || "Не вдалося додати коментар"
      );
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !validateToken(token)) {
        navigate("/login", {
          state: {
            from: `/books/${id}`,
            message: "Будь ласка, увійдіть для виконання цієї дії",
          },
        });
        return;
      }

      await axios.delete(`http://localhost:5000/api/comments/${commentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await fetchComments();
    } catch (err) {
      console.error("Помилка видалення коментаря:", err);
      setCommentError(
        err.response?.data?.error || "Не вдалося видалити коментар"
      );
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4>Помилка</h4>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">
            Назад до списку книг
          </Link>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          <h4>Книгу не знайдено</h4>
          <p>Книга з ID {id} не існує в нашій базі даних.</p>
          <Link to="/" className="btn btn-primary">
            Назад до списку книг
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <img
              src={`http://localhost:5000${book.cover_url || "/no-cover.jpg"}`}
              alt={`Обкладинка "${book.title}"`}
              className="card-img-top p-3"
              style={{
                height: "400px",
                objectFit: "contain",
                backgroundColor: "#f8f9fa",
              }}
              onError={(e) => {
                e.target.src = "/no-cover.jpg";
                e.target.style.objectFit = "contain";
              }}
            />

            {book.book_file_url && (
              <div className="card-footer bg-transparent">
                <a
                  href={`http://localhost:5000${book.book_file_url}`}
                  className="btn btn-success w-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-download me-2"></i>
                  Завантажити PDF
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h1 className="card-title">{book.title}</h1>
              <h3 className="text-muted mb-4">{book.author}</h3>

              <div className="mb-4">
                <h4>Рейтинг</h4>
                <div className="d-flex align-items-center mb-2">
                  <Rating
                    onClick={handleRating}
                    initialValue={userRating}
                    allowHover={
                      !ratingLoading &&
                      validateToken(localStorage.getItem("token"))
                    }
                    size={35}
                    transition
                    fillColor="#ffb400"
                    emptyColor="#e4e5e9"
                    fillClassName="rating-fill"
                    emptyClassName="rating-empty"
                    disable={ratingLoading}
                  />
                  <span className="ms-3 fs-5">
                    <strong>{averageRating.toFixed(1)}</strong>
                    <small className="text-muted">
                      {" "}
                      ({ratingsCount} оцінок)
                    </small>
                  </span>
                  {ratingLoading && (
                    <div
                      className="ms-2 spinner-border spinner-border-sm text-primary"
                      role="status"
                    >
                      <span className="visually-hidden">Завантаження...</span>
                    </div>
                  )}
                </div>
                {!validateToken(localStorage.getItem("token")) && (
                  <div className="text-muted small">
                    Увійдіть, щоб оцінити книгу
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h4>Опис</h4>
                <p className="lead">{book.description || "Опис відсутній"}</p>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="border p-3 rounded">
                    <h5 className="text-muted">Рік видання</h5>
                    <p className="fs-5">{book.year || "Невідомо"}</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border p-3 rounded">
                    <h5 className="text-muted">Категорія</h5>
                    <p className="fs-5">{book.category || "Не вказано"}</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border p-3 rounded">
                    <h5 className="text-muted">ID книги</h5>
                    <p className="fs-5">{book.id}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h4>Коментарі ({comments.length})</h4>

                {commentError && (
                  <div className="alert alert-danger">{commentError}</div>
                )}

                {validateToken(localStorage.getItem("token")) && (
                  <form onSubmit={handleAddComment} className="mb-4">
                    <div className="mb-3">
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Ваш коментар..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Оцінка (необов'язково)
                      </label>
                      <Rating
                        onClick={setCommentRating}
                        initialValue={commentRating}
                        size={25}
                        transition
                        fillColor="#ffb400"
                        emptyColor="#e4e5e9"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Додати коментар
                    </button>
                  </form>
                )}

                {commentsLoading ? (
                  <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Завантаження...</span>
                    </div>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="list-group">
                    {comments.map((comment) => (
                      <div key={comment.id} className="list-group-item">
                        <div className="d-flex justify-content-between">
                          <strong>{comment.username}</strong>
                          <small className="text-muted">
                            {new Date(comment.created_at).toLocaleString()}
                          </small>
                        </div>
                        {comment.rating && (
                          <div className="mb-2">
                            <Rating
                              readonly
                              initialValue={comment.rating}
                              size={20}
                              fillColor="#ffb400"
                              emptyColor="#e4e5e9"
                            />
                          </div>
                        )}
                        <p>{comment.text}</p>
                        {validateToken(localStorage.getItem("token")) &&
                          (comment.user_id ===
                            JSON.parse(
                              atob(localStorage.getItem("token").split(".")[1])
                            ).id ||
                            JSON.parse(
                              atob(localStorage.getItem("token").split(".")[1])
                            ).role === "admin") && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Видалити
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-info">
                    Ще немає коментарів. Будьте першим!
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center mt-4">
                <Link to="/book-list" className="btn btn-outline-primary">
                  <i className="bi bi-arrow-left me-2"></i>
                  Назад до списку
                </Link>

                {book.book_file_url && (
                  <a
                    href={`http://localhost:5000${book.book_file_url}`}
                    className="btn btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-book me-2"></i>
                    Читати книгу
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetails;
