/* Small SVG helpers shared by every page. No library: each chart is drawn from the page's
   own JSON island, so the numbers on screen are exactly the numbers the scripts wrote.
   Kept ASCII-only (non-ASCII characters are written as escapes). */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const MINUS = String.fromCharCode(0x2212);
  const C = {};
  C.$ = (s) => document.querySelector(s);
  C.data = () => JSON.parse(document.getElementById("data").textContent);
  C.set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  C.IN = (n) => Math.round(n).toLocaleString("en-IN");
  C.lakh = (n, d = 1) => (n / 1e5).toFixed(d);
  C.crore = (n, d = 2) => (n / 1e7).toFixed(d);
  C.pct = (v, d = 1) => (v == null ? "n/a" : v.toFixed(d) + "%");
  C.minus = (s) => String(s).replace("-", MINUS);
  C.signed = (v, d = 1) => (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(d);
  C.el = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };
  C.svg = (w, h, label) => C.el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label });
  C.width = (host) => Math.max(300, Math.min(host.clientWidth || 640, 960));

  const tip = () => document.getElementById("tip");
  C.show = (e, html) => {
    const t = tip(); if (!t) return;
    t.innerHTML = html; t.style.opacity = 1;
    let x = e.clientX + 14; if (x > innerWidth - 200) x = e.clientX - 200;
    let y = e.clientY + 14; if (y > innerHeight - 90) y = e.clientY - 80;
    t.style.left = x + "px"; t.style.top = y + "px";
  };
  C.hide = () => { const t = tip(); if (t) t.style.opacity = 0; };
  C.hover = (node, html) => {
    node.addEventListener("mousemove", (e) => C.show(e, html));
    node.addEventListener("mouseleave", C.hide);
    node.addEventListener("touchstart", (e) => C.show(e.touches[0], html), { passive: true });
  };

  /* horizontal gridlines with labels at the left, periodical style */
  C.ygrid = (s, W, m, ticks, Y, fmt) => {
    ticks.forEach((v, i) => {
      s.appendChild(C.el("line", { x1: 0, x2: W, y1: Y(v), y2: Y(v), class: i === 0 ? "gl0" : "gl" }));
      s.appendChild(C.el("text", { x: 0, y: Y(v) - 4, class: "tk" }, fmt ? fmt(v) : v));
    });
  };
  C.xticks = (s, ticks, X, y, fmt, anchor) => {
    ticks.forEach((v) => s.appendChild(C.el("text", { x: X(v), y, class: "tk",
      "text-anchor": anchor || "middle" }, fmt ? fmt(v) : v)));
  };
  C.dot = (s, x, y, r, cls, html) => {
    const c = C.el("circle", { cx: x, cy: y, r, class: cls || "dot" });
    s.appendChild(c);
    if (html) {
      const hit = C.el("circle", { cx: x, cy: y, r: Math.max(r + 5, 8), fill: "transparent" });
      C.hover(hit, html); s.appendChild(hit);
    }
    return c;
  };
  /* Work the reader cannot see yet waits: `later` runs when the browser is idle, `whenNear`
     when the element comes within a screen of the viewport. Keeps the first paint quick on
     a cheap phone. */
  C.later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
  C.whenNear = (el, fn) => {
    if (!el || !("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: "800px 0px" });
    io.observe(el);
  };
  /* redraw on resize so charts stay legible at phone width */
  C.responsive = (fn) => {
    fn();
    let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(fn, 150); });
  };
  /* The public address of the site, from the canonical link the page shell writes. */
  C.base = () => {
    const l = document.querySelector('link[rel="canonical"]');
    const u = l ? l.href : location.href;
    return u.replace(/[^/]*$/, "");
  };
  C.page = () => (location.pathname.split("/").pop() || "index.html");
  C.toast = (msg) => {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div"); t.id = "toast"; t.className = "toast";
      t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600);
  };
  C.copy = (text, done) => {
    const ok = () => C.toast(done || "Copied");
    const fallback = () => {
      const a = document.createElement("textarea"); a.value = text; a.setAttribute("readonly", "");
      a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select();
      let good = false; try { good = document.execCommand("copy"); } catch (e) { good = false; }
      a.remove(); good ? ok() : C.toast("Select and copy: " + text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  };
  /* A share row: copy link, WhatsApp, X, and (when given) the card image.
     opts: {url, text, image, label}. Text is one plain sentence; the link goes after it. */
  C.shareRow = (host, opts) => {
    const row = document.createElement("div");
    row.className = "share";
    const enc = encodeURIComponent;
    const msg = opts.text + " " + opts.url;
    row.innerHTML =
      `<span class="lbl">Share${opts.label ? " this " + opts.label : ""}</span>` +
      `<a class="wa" href="https://wa.me/?text=${enc(msg)}" target="_blank" rel="noopener">WhatsApp</a>` +
      `<a href="https://twitter.com/intent/tweet?text=${enc(opts.text)}&url=${enc(opts.url)}" target="_blank" rel="noopener">X</a>` +
      `<button type="button" data-act="link">Copy link</button>` +
      (opts.image ? `<a href="${opts.image}" target="_blank" rel="noopener">Image</a>` : "") +
      (opts.phone ? `<a href="${opts.phone}" target="_blank" rel="noopener">Phone image</a>` : "");
    row.querySelector('[data-act="link"]').addEventListener("click", () => C.copy(opts.url, "Link copied"));
    host.appendChild(row);
    return row;
  };
  /* Accessible companion for a chart: the one sentence that matters, written on the chart,
     and its numbers as a table behind a toggle. cols: [{h, r}] (r = right-align);
     rows: arrays of cell strings. The svg gets the sentence as its description. */
  C.describe = (fig, say, cols, rows, opts) => {
    if (typeof fig === "string") fig = document.getElementById(fig);
    if (!fig) return;
    let p = fig.querySelector(".say");
    if (!p) {
      p = document.createElement("p"); p.className = "say"; p.id = fig.id + "_say";
      const after = fig.querySelector(".s") || fig.querySelector(".t");
      after.insertAdjacentElement("afterend", p);
    }
    p.textContent = say;
    fig.querySelectorAll("svg[role=img]").forEach((s) => s.setAttribute("aria-describedby", p.id));
    let d = fig.querySelector("details.nums");
    if (!d) {
      d = document.createElement("details"); d.className = "nums";
      const src = fig.querySelector(".src");
      src ? src.insertAdjacentElement("beforebegin", d) : fig.appendChild(d);
    }
    /* The table is built when the reader opens it, not at load: some charts carry 234 rows,
       and building every table up front tripled the page's DOM on a cheap phone. */
    const build = () => {
      const head = cols.map((c) => `<th scope="col"${c.r ? ' class="r"' : ""}>${c.h}</th>`).join("");
      const body = rows.map((r) => "<tr>" + r.map((v, i) => (i === 0
        ? `<th scope="row" style="font-weight:400">${v}</th>`
        : `<td${cols[i] && cols[i].r ? ' class="r"' : ""}>${v}</td>`)).join("") + "</tr>").join("");
      d.querySelector(".tw").innerHTML =
        `<table><caption class="sr">${say}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    };
    const wasOpen = d.open;
    d.innerHTML = `<summary>Show the numbers${rows.length > 12 ? " (" + rows.length + " rows)" : ""}</summary>` +
      `<div class="tw" tabindex="0" role="region" aria-label="Numbers for: ${fig.querySelector(".t").textContent.replace(/"/g, "")}"></div>`;
    d._build = build;
    if (!d._wired) { d._wired = true; d.addEventListener("toggle", () => { if (d.open) d._build(); }); }
    if (wasOpen) build();
    if (!(opts && opts.noShare) && !fig.querySelector(".share")) {
      C.shareRow(fig, { url: C.base() + C.page() + "#" + fig.id, text: say, label: "chart" });
    }
  };
  addEventListener("beforeprint", () => document.querySelectorAll("details.nums").forEach((d) => { d.open = true; d._build && d._build(); }));
  window.C = C;
})();
