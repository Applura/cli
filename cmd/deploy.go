package cmd

import (
	"fmt"
	"github.com/applura/cli/jsonapi"
	"github.com/spf13/cobra"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// link relations.
const (
	relSelf                  = "self"
	relUploadFrontendArchive = "https://docs.applura.com/api/v1/link-relations/upload-front-end-archive"
	relDeployFrontendArchive = "https://docs.applura.com/api/v1/link-relations/deploy-front-end-archive"
)

const defaultMediaType = "application/vnd.api+json"

const apiHostname = "api.ops.applura.com"

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Upload and deploy new front-end source code",
	Long:  "The deploy command uploads and deploys front-end application source code from a local zip archive.",
	Run:   deploy,
	Args:  cobra.ExactArgs(1),
}

func init() {
	deployCmd.Flags().StringP("domain", "d", "", "the fully qualified domain name of the application to deploy")
	_ = deployCmd.MarkFlagRequired("domain")
}

func deploy(cmd *cobra.Command, args []string) {
	domain, err := cmd.Flags().GetString("domain")
	if err != nil {
		log.Fatalf("failed to parse domain flag: %v", err)
	}
	filepath := args[0]
	if len(args) > 1 {
		log.Fatalln("too many arguments")
	}
	if len(args) == 0 || len(args[0]) == 0 {
		log.Fatalln("missing file path argument")
	}
	file, err := os.Open(filepath)
	if err != nil {
		log.Fatalf("%s does not exist or is not readable: %v\n", filepath, err)
	}
	if err := getCredentials(); err != nil {
		log.Fatalf("credentials are required: %v", err)
	}
	uploadURL, releaseURL, err := createRelease(domain)
	if err != nil {
		log.Fatalf("could not create new release: %v", err)
	}
	releaseID, err := deployArchive(uploadURL, releaseURL, file)
	if err != nil {
		log.Fatalf("could not deploy release archive: %v", err)
	}
	fmt.Printf("deployed: %s\n", releaseID)
}

func createRelease(domain string) (uploadURL *url.URL, releaseURL *url.URL, err error) {
	// @todo: stop hard-coding this URL path.
	var site string
	for _, part := range strings.Split(domain, ".") {
		site = strings.Join([]string{part, site}, ".")
	}
	site = strings.Trim(site, ".")
	target := fmt.Sprintf("https://%s/applications/%s/releases", apiHostname, site)
	req, err := authorize(http.NewRequest("POST", target, nil))
	if err != nil {
		return nil, nil, fmt.Errorf("could not form release creation request: %w", err)
	}
	doc, err := doAPIRequest(req)
	if err != nil {
		return nil, nil, fmt.Errorf("release creation request failed: %w", err)
	}
	uploadURL, releaseURL = doc.GetDataLink(relUploadFrontendArchive), doc.GetDataLink(relSelf)
	if releaseURL == nil {
		return uploadURL, releaseURL, fmt.Errorf("release URL not found in response to creation request")
	}
	if uploadURL == nil {
		return uploadURL, releaseURL, fmt.Errorf("upload URL not found in response to creation request")
	}
	return uploadURL, releaseURL, nil
}

func deployArchive(uploadURL *url.URL, releaseURL *url.URL, archive *os.File) (id string, err error) {
	stat, err := archive.Stat()
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest("PUT", uploadURL.String(), archive)
	req.Header.Set("content-type", "application/zip")
	req.ContentLength = stat.Size()
	if err != nil {
		return "", fmt.Errorf("could not form upload request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	if resp.StatusCode >= 300 {
		body, _ := ioutil.ReadAll(resp.Body)
		for header, value := range req.Header {
			log.Printf("request header: %s: %s\n", header, value[0])
		}
		log.Printf("response body: %s\n", body)
		log.Println("upload URL:", uploadURL)
		return "", fmt.Errorf("unrecognized status in response to upload: %s", resp.Status)
	}
	req, err = authorize(http.NewRequest("GET", releaseURL.String(), nil))
	if err != nil {
		return "", fmt.Errorf("could not form post-upload status request: %w", err)
	}
	doc, err := doAPIRequest(req)
	if err != nil {
		return "", fmt.Errorf("post-upload status request failed: %w", err)
	}
	deployURL := doc.GetDataLink(relDeployFrontendArchive)
	if deployURL == nil {
		return "", fmt.Errorf("deploy URL not found in response to post-upload status request")
	}
	req, err = authorize(http.NewRequest("POST", deployURL.String(), nil))
	if err != nil {
		return "", fmt.Errorf("could not form deployment request: %w", err)
	}
	doc, err = doAPIRequest(req)
	if err != nil {
		return "", fmt.Errorf("deployment request failed: %w", err)
	}
	if attr, hasStatus := doc.GetAttribute("status"); !hasStatus {
		return "", fmt.Errorf("deployment response document does not contain a current status; please report this error. time: %s, release: %s", time.Now().Format(time.RFC3339), doc.ID())
	} else if statusStr, ok := attr.(string); !ok || statusStr != "active" {
		return "", fmt.Errorf("deployed release was not activated; please report this error. time: %s, release: %s", time.Now().Format(time.RFC3339), doc.ID())
	}
	return doc.ID(), nil
}

func doAPIRequest(r *http.Request) (*jsonapi.Document, error) {
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("unsuccessful request: %s", resp.Status)
	}
	if !strings.HasPrefix(resp.Header.Get("content-type"), defaultMediaType) {
		return nil, fmt.Errorf("unrecognized content type: %s", resp.Header.Get("content-type"))
	}
	doc, err := jsonapi.Decode(resp.Body, resp.Request.URL)
	if err != nil {
		return nil, fmt.Errorf("could not decode response: %w", err)
	}
	if doc.Type() != "frontend-release" {
		return nil, fmt.Errorf("unexpected resource type in response document: %s", doc.Type())
	}
	return doc, nil
}

func authorize(r *http.Request, err error) (*http.Request, error) {
	if err != nil {
		return r, err
	}
	r.SetBasicAuth(username, password)
	return r, err
}
