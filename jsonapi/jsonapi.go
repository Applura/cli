package jsonapi

import (
	"encoding/json"
	"io"
	"net/url"
)

type Document struct {
	Data struct {
		Type       string
		ID         string
		Attributes map[string]interface{}
		Links      map[string]struct {
			Href string
			Rel  string
		}
	}
	baseURL *url.URL
}

func Decode(r io.Reader, baseURL *url.URL) (*Document, error) {
	doc := &Document{baseURL: baseURL}
	err := json.NewDecoder(r).Decode(doc)
	return doc, err
}

func (d *Document) Encode(w io.Writer) error {
	return json.NewEncoder(w).Encode(d)
}

func (d *Document) Type() string {
	return d.Data.Type
}

func (d *Document) ID() string {
	return d.Data.ID
}

func (d *Document) GetAttribute(name string) (interface{}, bool) {
	val, ok := d.Data.Attributes[name]
	return val, ok
}

func (d *Document) BaseURL() *url.URL {
	return d.baseURL
}

func (d *Document) GetDataLink(rel string) *url.URL {
	for _, link := range d.Data.Links {
		if link.Rel == rel {
			u, err := url.Parse(link.Href)
			if err != nil {
				return nil
			}
			if u.IsAbs() {
				return u
			}
			if d.baseURL == nil {
				panic("missing base URL")
			}
			return d.baseURL.ResolveReference(u)
		}
	}
	return nil
}
