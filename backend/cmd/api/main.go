package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/AmirulJusticia0507/GarduCilik/backend/internal/auth"
	"github.com/AmirulJusticia0507/GarduCilik/backend/internal/config"
	"github.com/AmirulJusticia0507/GarduCilik/backend/internal/models"
	"github.com/AmirulJusticia0507/GarduCilik/backend/internal/store"
)

type api struct {
	cfg config.Config
	db  *pgxpool.Pool
}

func main() {
	loadDotEnv()
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := store.Open(context.Background(), cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	a := &api{cfg: cfg, db: db}
	app := fiber.New(fiber.Config{ErrorHandler: func(c *fiber.Ctx, err error) error {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}})
	app.Use(recover.New(), logger.New())
	app.Get("/health", a.health)
	v1 := app.Group("/api/v1")
	v1.Post("/auth/teacher/register", a.teacherRegister)
	v1.Post("/auth/teacher/login", a.teacherLogin)
	v1.Post("/auth/student/join", a.studentJoin)
	v1.Get("/scenarios", a.listScenarios)
	v1.Get("/scenarios/:id", a.getScenario)
	v1.Post("/scenarios", a.requireRole("teacher"), a.createScenario)
	v1.Post("/classrooms", a.requireRole("teacher"), a.createClassroom)
	v1.Post("/sessions/submit", a.requireRole("student"), a.submitSession)
	v1.Get("/classrooms/:id/leaderboard", a.leaderboard)

	log.Fatal(app.Listen(":" + cfg.Port))
}

func loadDotEnv() {
	data, err := os.ReadFile(".env")
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.SplitN(strings.TrimSpace(line), "=", 2)
		if len(parts) == 2 && os.Getenv(parts[0]) == "" {
			_ = os.Setenv(parts[0], strings.Trim(strings.TrimSpace(parts[1]), "\""))
		}
	}
}
func (a *api) health(c *fiber.Ctx) error {
	if err := a.db.Ping(c.Context()); err != nil {
		return c.Status(503).JSON(fiber.Map{"status": "degraded", "database": "unavailable"})
	}
	return c.JSON(fiber.Map{"status": "ok", "database": "ok"})
}
func body[T any](c *fiber.Ctx, out *T) error {
	if err := c.BodyParser(out); err != nil {
		return fiber.NewError(400, "invalid_json")
	}
	return nil
}
func jsonResponse(c *fiber.Ctx, status int, value any) error { return c.Status(status).JSON(value) }

type teacherInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *api) teacherRegister(c *fiber.Ctx) error {
	var in teacherInput
	if err := body(c, &in); err != nil {
		return err
	}
	if len(in.Password) < 8 || in.Name == "" || in.Email == "" {
		return fiber.NewError(400, "name,email,password_min_8_required")
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	var u models.User
	err := a.db.QueryRow(c.Context(), `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'teacher') RETURNING id,name,email,role,created_at`, in.Name, in.Email, string(hash)).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt)
	if err != nil {
		return fiber.NewError(409, "email_already_exists")
	}
	return jsonResponse(c, 201, fiber.Map{"user": u})
}
func (a *api) teacherLogin(c *fiber.Ctx) error {
	var in teacherInput
	if err := body(c, &in); err != nil {
		return err
	}
	var u models.User
	var hash string
	err := a.db.QueryRow(c.Context(), `SELECT id,name,email,role,password_hash,created_at FROM users WHERE email=$1 AND role='teacher'`, in.Email).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &hash, &u.CreatedAt)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil {
		return fiber.NewError(401, "invalid_credentials")
	}
	token, err := auth.Issue(u.ID, string(u.Role), a.cfg.JWTSecret, a.cfg.JWTTTL)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"token": token, "user": u})
}

type joinInput struct {
	Name     string `json:"name"`
	JoinCode string `json:"join_code"`
}

func (a *api) studentJoin(c *fiber.Ctx) error {
	var in joinInput
	if err := body(c, &in); err != nil {
		return err
	}
	if in.Name == "" || in.JoinCode == "" {
		return fiber.NewError(400, "name_and_join_code_required")
	}
	tx, err := a.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())
	var uid, cid uuid.UUID
	err = tx.QueryRow(c.Context(), `SELECT id FROM classrooms WHERE join_code=$1`, strings.ToUpper(in.JoinCode)).Scan(&cid)
	if err != nil {
		return fiber.NewError(404, "classroom_not_found")
	}
	err = tx.QueryRow(c.Context(), `INSERT INTO users(name,role) VALUES($1,'student') RETURNING id`, in.Name).Scan(&uid)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(c.Context(), `INSERT INTO classroom_members(classroom_id,student_id) VALUES($1,$2)`, cid, uid); err != nil {
		return err
	}
	if err = tx.Commit(c.Context()); err != nil {
		return err
	}
	token, err := auth.Issue(uid, "student", a.cfg.JWTSecret, a.cfg.JWTTTL)
	return c.Status(201).JSON(fiber.Map{"token": token, "user": fiber.Map{"id": uid, "name": in.Name, "role": "student"}})
}

func (a *api) requireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		h := c.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			return fiber.NewError(401, "authorization_required")
		}
		claims, err := auth.Parse(strings.TrimPrefix(h, "Bearer "), a.cfg.JWTSecret)
		if err != nil || claims.Role != role {
			return fiber.NewError(403, "forbidden")
		}
		c.Locals("user_id", claims.UserID)
		return c.Next()
	}
}
func userID(c *fiber.Ctx) (uuid.UUID, error) {
	id, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return uuid.Nil, fmt.Errorf("missing user")
	}
	return id, nil
}

func (a *api) createClassroom(c *fiber.Ctx) error {
	var in struct {
		Name string `json:"name"`
	}
	if err := body(c, &in); err != nil {
		return err
	}
	if in.Name == "" {
		return fiber.NewError(400, "name_required")
	}
	uid, _ := userID(c)
	var id uuid.UUID
	var code string
	err := a.db.QueryRow(c.Context(), `INSERT INTO classrooms(teacher_id,name,join_code) VALUES($1,$2,UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-','') FROM 1 FOR 8))) RETURNING id,join_code`, uid, in.Name).Scan(&id, &code)
	if err != nil {
		return err
	}
	return c.Status(201).JSON(fiber.Map{"id": id, "name": in.Name, "join_code": code})
}
func validGrid(g models.GridConfig) error {
	if g.MCBLimitVA < 1 || g.DurationSecond < 1 || g.TargetMaxKWh < 0 || len(g.Appliances) == 0 {
		return fmt.Errorf("invalid_grid_config")
	}
	seen := map[string]bool{}
	for _, x := range g.Appliances {
		if x.ID == "" || x.Watt <= 0 || x.Inrush < 1 || seen[x.ID] {
			return fmt.Errorf("invalid_appliance_config")
		}
		seen[x.ID] = true
	}
	return nil
}

type scenarioInput struct {
	Title      string            `json:"title"`
	Difficulty string            `json:"difficulty"`
	IsPublic   bool              `json:"is_public"`
	GridConfig models.GridConfig `json:"grid_config"`
}

func (a *api) createScenario(c *fiber.Ctx) error {
	var in scenarioInput
	if err := body(c, &in); err != nil {
		return err
	}
	if in.Title == "" || in.Difficulty != "easy" && in.Difficulty != "medium" && in.Difficulty != "hard" || validGrid(in.GridConfig) != nil {
		return fiber.NewError(400, "invalid_scenario")
	}
	uid, _ := userID(c)
	raw, _ := json.Marshal(in.GridConfig)
	var s models.Scenario
	err := a.db.QueryRow(c.Context(), `INSERT INTO scenarios(creator_id,title,difficulty,is_public,grid_config) VALUES($1,$2,$3,$4,$5) RETURNING id,creator_id,title,difficulty,is_public,grid_config,created_at`, uid, in.Title, in.Difficulty, in.IsPublic, raw).Scan(&s.ID, &s.CreatorID, &s.Title, &s.Difficulty, &s.IsPublic, &raw, &s.CreatedAt)
	if err != nil {
		return err
	}
	_ = json.Unmarshal(raw, &s.GridConfig)
	return c.Status(201).JSON(s)
}
func (a *api) listScenarios(c *fiber.Ctx) error {
	rows, err := a.db.Query(c.Context(), `SELECT id,creator_id,title,difficulty,is_public,grid_config,created_at FROM scenarios WHERE is_public=true ORDER BY created_at DESC`)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []models.Scenario{}
	for rows.Next() {
		var s models.Scenario
		var raw []byte
		if err := rows.Scan(&s.ID, &s.CreatorID, &s.Title, &s.Difficulty, &s.IsPublic, &raw, &s.CreatedAt); err != nil {
			return err
		}
		_ = json.Unmarshal(raw, &s.GridConfig)
		out = append(out, s)
	}
	return c.JSON(fiber.Map{"scenarios": out})
}
func (a *api) getScenario(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(400, "invalid_id")
	}
	var s models.Scenario
	var raw []byte
	err = a.db.QueryRow(c.Context(), `SELECT id,creator_id,title,difficulty,is_public,grid_config,created_at FROM scenarios WHERE id=$1 AND is_public=true`, id).Scan(&s.ID, &s.CreatorID, &s.Title, &s.Difficulty, &s.IsPublic, &raw, &s.CreatedAt)
	if err == pgx.ErrNoRows {
		return fiber.NewError(404, "scenario_not_found")
	}
	if err != nil {
		return err
	}
	_ = json.Unmarshal(raw, &s.GridConfig)
	return c.JSON(s)
}

type submitInput struct {
	ScenarioID   uuid.UUID  `json:"scenario_id"`
	ClassroomID  *uuid.UUID `json:"classroom_id,omitempty"`
	TotalKWhUsed float64    `json:"total_kwh_used"`
	TripCount    int        `json:"trip_count"`
	Duration     int        `json:"duration_seconds"`
}

func (a *api) submitSession(c *fiber.Ctx) error {
	var in submitInput
	if err := body(c, &in); err != nil {
		return err
	}
	if in.TotalKWhUsed < 0 || in.TripCount < 0 || in.Duration < 1 {
		return fiber.NewError(400, "invalid_session")
	}
	uid, _ := userID(c)
	var raw []byte
	var g models.GridConfig
	err := a.db.QueryRow(c.Context(), `SELECT grid_config FROM scenarios WHERE id=$1`, in.ScenarioID).Scan(&raw)
	if err == pgx.ErrNoRows {
		return fiber.NewError(404, "scenario_not_found")
	}
	if err != nil {
		return err
	}
	if json.Unmarshal(raw, &g) != nil {
		return fiber.NewError(500, "invalid_scenario_data")
	}
	if in.Duration > g.DurationSecond*2 || in.TotalKWhUsed > g.TargetMaxKWh*20 {
		return fiber.NewError(422, "session_failed_sanity_check")
	}
	stars := 3
	if in.TripCount > 0 {
		stars = 1
	}
	if in.TripCount > 2 {
		stars = 0
	}
	score := stars*300 - in.TripCount*50
	if score < 0 {
		score = 0
	}
	var id uuid.UUID
	err = a.db.QueryRow(c.Context(), `INSERT INTO session_logs(user_id,scenario_id,classroom_id,total_kwh_used,trip_count,stars_earned,score,duration_seconds) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, uid, in.ScenarioID, in.ClassroomID, in.TotalKWhUsed, in.TripCount, stars, score, in.Duration).Scan(&id)
	if err != nil {
		return err
	}
	return c.Status(201).JSON(fiber.Map{"id": id, "score": score, "stars_earned": stars})
}
func (a *api) leaderboard(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(400, "invalid_id")
	}
	rows, err := a.db.Query(c.Context(), `SELECT u.id,u.name,MAX(s.score),MIN(s.total_kwh_used),MIN(s.trip_count) FROM session_logs s JOIN users u ON u.id=s.user_id WHERE s.classroom_id=$1 GROUP BY u.id,u.name ORDER BY MAX(s.score) DESC,MIN(s.total_kwh_used) ASC LIMIT 100`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	type row struct {
		UserID uuid.UUID `json:"user_id"`
		Name   string    `json:"name"`
		Score  int       `json:"score"`
		KWh    float64   `json:"total_kwh_used"`
		Trips  int       `json:"trip_count"`
	}
	out := []row{}
	for rows.Next() {
		var x row
		if err := rows.Scan(&x.UserID, &x.Name, &x.Score, &x.KWh, &x.Trips); err != nil {
			return err
		}
		out = append(out, x)
	}
	return c.JSON(fiber.Map{"leaderboard": out})
}

var _ = time.Now
