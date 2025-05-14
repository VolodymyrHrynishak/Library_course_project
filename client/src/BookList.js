                <div style={{ height: "300px", overflow: "hidden", borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', backgroundColor: 'var(--card-bg)' }}>
                  <img
                    src={`http://localhost:5000${book.cover_url || ""}`}
                    className="card-img-top h-100 w-100"
                    alt={`Обкладинка "${book.title}"`}
                    style={{
                      objectFit: book.cover_url ? "cover" : "contain",
                      backgroundColor: 'transparent',
                    }}
                    onError={handleImageError}
                  />
                </div> 