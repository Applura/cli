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

func initCredentials() error {
	if err := initUsername(); err != nil {
		return err
	}
	return initPassword()
}

func initUsername() error {
	if len(username) > 0 {
		return nil
	}
	var ok bool
	username, ok = os.LookupEnv("APPLURA_CLI_USERNAME")
	if ok {
		return nil
	}
	var err error
	if len(username) == 0 {
		fmt.Printf("username: ")
		_, err = fmt.Scanln(&username)
		if err != nil {
			return err
		}
	}
	return nil
}

func initPassword() error {
	var ok bool
	password, ok = os.LookupEnv("APPLURA_CLI_PASSWORD")
	if ok {
		return nil
	}
	fmt.Printf("password: ")
	p, err := terminal.ReadPassword(syscall.Stdin)
	fmt.Printf("\n")
	if err != nil {
		return err
	}
	if len(p) == 0 {
		return fmt.Errorf("please enter a password or set the APPLURA_CLI_PASSWORD environment variable")
	}
	password = fmt.Sprintf("%s", p)
	return nil
}
