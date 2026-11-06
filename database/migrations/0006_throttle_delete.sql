-- El servicio de auth debe poder limpiar el contador tras un login correcto.
GRANT DELETE ON auth.login_throttle TO auth_service;
