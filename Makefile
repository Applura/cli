BINARY=bin/applura
SOURCES := $(shell find . -name "*.go" ! -name "*_test.go")

$(BINARY): $(SOURCES)
	go build -o $@

clean:
	rm $(BINARY)

.PHONY: clean
