const { sessionTtlMs } = require("../config");
const COOKIE_NAME = "sgcv_session";

function getSessionToken(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
}

function cookieOptions(req) {
  return { httpOnly: true, sameSite: "strict", secure: req.secure, path: "/" };
}

function setSessionCookie(res, req, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: sessionTtlMs });
}

function clearSessionCookie(res, req) {
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
}

module.exports = { getSessionToken, setSessionCookie, clearSessionCookie };
