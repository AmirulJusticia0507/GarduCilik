package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	JWTTTL      time.Duration
	DBMaxConns  int32
}

func Load() (Config, error) {
	c := Config{
		Port:        envOr("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTTTL:      24 * time.Hour,
		DBMaxConns:  10,
	}

	if value := os.Getenv("JWT_TTL"); value != "" {
		duration, err := time.ParseDuration(value)
		if err != nil || duration <= 0 {
			return Config{}, fmt.Errorf("JWT_TTL tidak valid: %w", err)
		}
		c.JWTTTL = duration
	}
	if value := os.Getenv("DB_MAX_CONNS"); value != "" {
		connections, err := strconv.ParseInt(value, 10, 32)
		if err != nil || connections < 1 {
			return Config{}, fmt.Errorf("DB_MAX_CONNS tidak valid: %w", err)
		}
		c.DBMaxConns = int32(connections)
	}
	if c.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL wajib diisi")
	}
	if len(c.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET wajib minimal 32 karakter")
	}
	return c, nil
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
