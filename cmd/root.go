package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"golang.org/x/crypto/ssh/terminal"
	"os"
	"syscall"
)

var (
	username string
	password string
)

var rootCmd = &cobra.Command{
	Use:   "applura",
	Short: "Interact with Applura hosted applications",
	Long: `The applura command line utility deploys and manages applications hosted on the
Applura web application platform`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Applura command line utility. Try: %s --help\n", os.Args[0])
	},
}

func init() {
	rootCmd.PersistentFlags().StringVar(&username, "user", "", "your username")
	rootCmd.AddCommand(deployCmd)
}

func Execute() error {
	return rootCmd.Execute()
}

func getCredentials() error {
	var err error
	if len(username) == 0 {
		fmt.Printf("username: ")
		_, err = fmt.Scanln(&username)
		if err != nil {
			return err
		}
	}
	fmt.Printf("password: ")
	p, err := terminal.ReadPassword(syscall.Stdin)
	fmt.Printf("\n")
	if err != nil {
		return err
	}
	if len(p) == 0 {
		return fmt.Errorf("please enter a password")
	}
	password = fmt.Sprintf("%s", p)
	return nil
}
