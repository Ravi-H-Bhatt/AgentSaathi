/**
 * Safe arithmetic evaluator (no eval). Supports + - * / % ^, parentheses,
 * unary minus, and common functions. Used by the assistant's calculator tool
 * so math queries are computed deterministically rather than guessed by the LLM.
 */
type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "fn"; v: string }
  | { t: "comma" };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  log: Math.log,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(input: string): Tok[] {
  const s = input.toLowerCase().replace(/\s+/g, "");
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      toks.push({ t: "num", v: parseFloat(num) });
      continue;
    }
    if (/[a-z]/.test(c)) {
      let word = "";
      while (i < s.length && /[a-z0-9]/.test(s[i])) word += s[i++];
      if (word in CONSTS) toks.push({ t: "num", v: CONSTS[word] });
      else if (word in FUNCS) toks.push({ t: "fn", v: word });
      else throw new Error(`Unknown identifier: ${word}`);
      continue;
    }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    if (c === ",") { toks.push({ t: "comma" }); i++; continue; }
    if ("+-*/%^".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Unexpected character: ${c}`);
  }
  return toks;
}

/** Recursive-descent parser/evaluator. */
function evaluate(toks: Tok[]): number {
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (peek()?.t === "op" && ["+", "-"].includes((peek() as { v: string }).v)) {
      const op = (eat() as { v: string }).v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (
      peek()?.t === "op" &&
      ["*", "/", "%"].includes((peek() as { v: string }).v)
    ) {
      const op = (eat() as { v: string }).v;
      const right = parseFactor();
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  }

  function parseFactor(): number {
    const base = parseUnary();
    if (peek()?.t === "op" && (peek() as { v: string }).v === "^") {
      eat();
      return Math.pow(base, parseFactor());
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.t === "op" && (peek() as { v: string }).v === "-") {
      eat();
      return -parseUnary();
    }
    if (peek()?.t === "op" && (peek() as { v: string }).v === "+") {
      eat();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.t === "num") { eat(); return tok.v; }
    if (tok.t === "fn") {
      eat();
      if (peek()?.t !== "lp") throw new Error("Expected ( after function");
      eat();
      const args: number[] = [parseExpr()];
      while (peek()?.t === "comma") { eat(); args.push(parseExpr()); }
      if (peek()?.t !== "rp") throw new Error("Expected )");
      eat();
      return FUNCS[tok.v](...args);
    }
    if (tok.t === "lp") {
      eat();
      const v = parseExpr();
      if (peek()?.t !== "rp") throw new Error("Expected )");
      eat();
      return v;
    }
    throw new Error("Unexpected token");
  }

  const result = parseExpr();
  if (pos !== toks.length) throw new Error("Unexpected trailing input");
  return result;
}

export function calculate(expression: string): { result: number } {
  const toks = tokenize(expression);
  const result = evaluate(toks);
  if (!isFinite(result)) throw new Error("Result is not a finite number");
  return { result };
}
