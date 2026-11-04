function createAccessControl(getSession, sendJson) {
  function requireAuth(req, res) {
    const authenticated = getSession(req);
    if (!authenticated) {
      sendJson(res, 401, { error: "Acesso negado" });
      return null;
    }
    return authenticated;
  }

  function requireProfile(...allowedProfiles) {
    return (req, res) => {
      const authenticated = requireAuth(req, res);
      if (!authenticated) return null;
      if (!allowedProfiles.includes(authenticated.user.perfil)) {
        sendJson(res, 403, { error: "Acesso negado" });
        return null;
      }
      return authenticated;
    };
  }

  return { requireAuth, requireProfile };
}

module.exports = { createAccessControl };
