from __future__ import annotations

import re
from html import escape
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse


ROOT = Path(__file__).resolve().parent
API_REFERENCE = ROOT / "api-reference.md"
DOC_FILES = sorted([path for path in ROOT.glob("*.md") if path.name not in {"README.md"}], key=lambda path: path.name.lower())

app = FastAPI(title="GCH-VR Docs Server", version="1.0.0")


def render_page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f5f7fb; color: #122033; }}
    header {{ background: linear-gradient(135deg, #0f172a, #1d4ed8); color: white; padding: 24px 32px; }}
    main {{ max-width: 1100px; margin: 0 auto; padding: 24px 32px 48px; }}
    .card {{ background: white; border-radius: 16px; padding: 20px 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); margin-bottom: 18px; }}
    a {{ color: #1d4ed8; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    ul {{ line-height: 1.8; }}
    pre {{ white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 12px; overflow-x: auto; }}
    .crumbs {{ margin-bottom: 12px; color: #64748b; }}
  </style>
</head>
<body>
  <header>
    <h1>{escape(title)}</h1>
  </header>
  <main>
    {body}
  </main>
</body>
</html>"""


def render_markdown(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    html_parts: list[str] = []
    in_code_block = False
    code_lines: list[str] = []

    def flush_paragraph(buffer: list[str]) -> str:
        text = " ".join(item.strip() for item in buffer).strip()
        if not text:
            return ""
        text = escape(text)
        text = text.replace("**", "</strong>")
        text = text.replace("__", "</strong>")
        text = text.replace("<strong></strong>", "")
        return f"<p>{text}</p>"

    paragraph: list[str] = []
    for raw_line in lines:
        line = raw_line.rstrip()
        if line.startswith("```"):
            if in_code_block:
                html_parts.append(f"<pre>{escape(chr(10).join(code_lines))}</pre>")
                code_lines = []
                in_code_block = False
            else:
                if paragraph:
                    html_parts.append(flush_paragraph(paragraph))
                    paragraph = []
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if not line.strip():
            if paragraph:
                html_parts.append(flush_paragraph(paragraph))
                paragraph = []
            continue

        if line.startswith("# "):
            if paragraph:
                html_parts.append(flush_paragraph(paragraph))
                paragraph = []
            html_parts.append(f"<h1>{escape(line[2:].strip())}</h1>")
            continue
        if line.startswith("## "):
            if paragraph:
                html_parts.append(flush_paragraph(paragraph))
                paragraph = []
            html_parts.append(f"<h2>{escape(line[3:].strip())}</h2>")
            continue
        if line.startswith("### "):
            if paragraph:
                html_parts.append(flush_paragraph(paragraph))
                paragraph = []
            html_parts.append(f"<h3>{escape(line[4:].strip())}</h3>")
            continue
        if line.startswith("- "):
            if paragraph:
                html_parts.append(flush_paragraph(paragraph))
                paragraph = []
            html_parts.append(f"<li>{escape(line[2:].strip())}</li>")
            continue

        paragraph.append(line)

    if paragraph:
        html_parts.append(flush_paragraph(paragraph))
    if in_code_block and code_lines:
        html_parts.append(f"<pre>{escape(chr(10).join(code_lines))}</pre>")

    return "\n".join(html_parts)


def extract_http_endpoints(markdown_text: str) -> list[tuple[str, str, str]]:
    endpoints: list[tuple[str, str, str]] = []
    for line in markdown_text.splitlines():
        match = re.match(r"^###\s+\d+\.\d+\s+`?(GET|POST|PUT|PATCH|DELETE)\s+([^`]+)`?\s+—\s+(.+)$", line.strip())
        if match:
            endpoints.append((match.group(1), match.group(2).strip(), match.group(3).strip()))
    return endpoints


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
        api_text = API_REFERENCE.read_text(encoding="utf-8") if API_REFERENCE.exists() else ""
        endpoints = extract_http_endpoints(api_text)
        items = "\n".join(
                f'<li><a href="/docs/api-reference.md"><strong>{escape(method)}</strong> {escape(path)}</a> <span>— {escape(summary)}</span></li>'
                for method, path, summary in endpoints
        ) or '<li><a href="/docs/api-reference.md">api-reference.md</a></li>'
        body = f"""
        <div class="card">
            <div class="crumbs">HTTP methods and API endpoint docs</div>
            <p>This view centers on the REST API surface documented in <a href="/docs/api-reference.md">api-reference.md</a>.</p>
            <ul>
                {items}
            </ul>
        </div>
        """
        return render_page("GCH-VR API Docs", body)


@app.get("/docs/{doc_name}", response_class=HTMLResponse)
async def view_doc(doc_name: str) -> str:
    doc_path = ROOT / doc_name
    if doc_path.suffix.lower() != ".md" or not doc_path.exists() or not doc_path.is_file():
        raise HTTPException(status_code=404, detail="Documentation file not found")
    markdown_text = doc_path.read_text(encoding="utf-8")
    rendered_doc = render_markdown(markdown_text)
    if doc_path.name == "api-reference.md":
        endpoint_list = extract_http_endpoints(markdown_text)
        endpoint_markup = "".join(f"<li><strong>{escape(method)}</strong> {escape(path)} — {escape(summary)}</li>" for method, path, summary in endpoint_list)
        rendered_doc = (
            "<h2>Endpoint Index</h2>"
            f"<ul>{endpoint_markup}</ul>"
            f"{rendered_doc}"
        )
    body = f"""
    <div class="card">
      <div class="crumbs"><a href="/">Back to docs</a> · {escape(doc_path.name)}</div>
      {rendered_doc}
    </div>
    """
    return render_page(doc_path.name, body)