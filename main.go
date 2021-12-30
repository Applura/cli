package main

import (
	"github.com/applura/cli/cmd"
	"log"
	"os"
)

func main() {
	log.SetFlags(0)
	if err := cmd.Execute(); err != nil {
		log.Println(err)
		os.Exit(1)
	}
}
