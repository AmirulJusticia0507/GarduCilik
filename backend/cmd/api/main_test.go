package main

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestCORSAllowsConfiguredFrontendAndPreflight(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "http://localhost:3001")
	app := fiber.New()
	app.Use(cors())
	app.Post("/api/v1/sessions/submit", func(c *fiber.Ctx) error { return c.SendStatus(201) })

	request := httptest.NewRequest("OPTIONS", "/api/v1/sessions/submit", nil)
	request.Header.Set("Origin", "http://localhost:3001")
	request.Header.Set("Access-Control-Request-Method", "POST")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusNoContent)
	}
	if got := response.Header.Get("Access-Control-Allow-Origin"); got != "http://localhost:3001" {
		t.Fatalf("allow origin = %q", got)
	}
}

func TestCORSDoesNotAllowUnknownOrigin(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "http://localhost:3001")
	app := fiber.New()
	app.Use(cors())
	app.Get("/health", func(c *fiber.Ctx) error { return c.SendStatus(200) })

	request := httptest.NewRequest("GET", "/health", nil)
	request.Header.Set("Origin", "https://unexpected.example")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if got := response.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unexpected allow origin %q", got)
	}
}
