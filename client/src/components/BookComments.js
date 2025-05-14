import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const BookComments = () => {
  const { id } = useParams();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Оптимізована функція для завантаження коментарів
  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`/api/books/${id}/comments`, {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });
      setComments(res.data.comments);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination?.total || 0,
      }));
    } catch (err) {
      console.error("Помилка завантаження коментарів:", err);
    }
  }, [id, pagination.page, pagination.limit]);

  useEffect(() => {
    // Перевірка авторизації та прав користувача
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUserId(decoded.id);
        setIsAdmin(decoded.role === "admin");
      } catch (err) {
        console.error("Помилка декодування токена:", err);
      }
    }

    fetchComments();
  }, [fetchComments]);

  // Обробник відправки нового коментаря
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post(
        `/api/books/${id}/comments`,
        {
          text: newComment.trim(),
          rating: rating > 0 ? rating : undefined,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setNewComment("");
      setRating(0);
      // Оновлюємо коментарі та скидаємо пагінацію на першу сторінку
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchComments();
    } catch (err) {
      console.error("Помилка додавання коментаря:", err);
      alert("Не вдалося додати коментар. Спробуйте ще раз.");
    }
  };

  // Обробник видалення коментаря
  const handleDelete = async (commentId) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей коментар?"))
      return;

    try {
      await axios.delete(`/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchComments();
    } catch (err) {
      console.error("Помилка видалення коментаря:", err);
      alert("Не вдалося видалити коментар. Можливо, у вас немає прав.");
    }
  };

  return (
    <div className="book-comments">
      <h3>Коментарі ({pagination.total})</h3>

      {/* Форма додавання коментаря */}
      {userId ? (
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ваш коментар..."
            required
            minLength={3}
            maxLength={500}
          />
          <div className="rating-input">
            <span>Оцінка (необов'язково):</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className={`star ${star <= rating ? "active" : ""}`}
                onClick={() => setRating(star)}
                aria-label={`Оцінка ${star}`}
              >
                ★
              </button>
            ))}
          </div>
          <button type="submit">Додати коментар</button>
        </form>
      ) : (
        <p>Увійдіть, щоб залишити коментар</p>
      )}

      {/* Список коментарів */}
      <div className="comments-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <strong>{comment.username}</strong>
                {comment.rating > 0 && (
                  <span className="comment-rating">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <span
                          key={i}
                          className={i < comment.rating ? "filled" : ""}
                        >
                          ★
                        </span>
                      ))}
                  </span>
                )}
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleDateString("uk-UA")}
                </span>
                {(comment.user_id === userId || isAdmin) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="delete-comment"
                    aria-label="Видалити коментар"
                  >
                    Видалити
                  </button>
                )}
              </div>
              <p>{comment.text}</p>
            </div>
          ))
        ) : (
          <p>Ще немає коментарів. Будьте першим!</p>
        )}
      </div>

      {/* Пагінація */}
      {pagination.total > pagination.limit && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Назад
          </button>
          <span>
            Сторінка {pagination.page} з{" "}
            {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            disabled={pagination.page * pagination.limit >= pagination.total}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Вперед
          </button>
        </div>
      )}
    </div>
  );
};

export default BookComments;
