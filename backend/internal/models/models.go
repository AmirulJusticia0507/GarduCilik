package models

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleTeacher Role = "teacher"
	RoleStudent Role = "student"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email,omitempty"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type GridConfig struct {
	MCBLimitVA     int             `json:"mcb_limit_va"`
	DurationSecond int             `json:"duration_seconds"`
	TargetMaxKWh   float64         `json:"target_max_kwh"`
	HasSolar       bool            `json:"has_solar"`
	Appliances     []GridAppliance `json:"appliances"`
}

type GridAppliance struct {
	ID      string  `json:"id"`
	Watt    float64 `json:"watt"`
	Inrush  float64 `json:"inrush"`
	Standby float64 `json:"standby_watt,omitempty"`
}

type Scenario struct {
	ID         uuid.UUID  `json:"id"`
	CreatorID  *uuid.UUID `json:"creator_id,omitempty"`
	Title      string     `json:"title"`
	Difficulty string     `json:"difficulty"`
	IsPublic   bool       `json:"is_public"`
	GridConfig GridConfig `json:"grid_config"`
	CreatedAt  time.Time  `json:"created_at"`
}

type SessionResult struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	ScenarioID   uuid.UUID  `json:"scenario_id"`
	ClassroomID  *uuid.UUID `json:"classroom_id,omitempty"`
	TotalKWhUsed float64    `json:"total_kwh_used"`
	TripCount    int        `json:"trip_count"`
	StarsEarned  int        `json:"stars_earned"`
	Score        int        `json:"score"`
	Duration     int        `json:"duration_seconds"`
	CompletedAt  time.Time  `json:"completed_at"`
}
