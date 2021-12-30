BINARY=bin/applura
SOURCES := $(shell find . -name "*.go" ! -name "*_test.go")

$(BINARY): $(SOURCES)
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $@

clean:
	rm $(BINARY)

.PHONY: clean
