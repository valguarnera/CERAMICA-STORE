# CERAMICA-STORE — Agent Instructions

## 1. Propósito

CERAMICA-STORE es una tienda online pequeña de cerámica.

El objetivo es construir una aplicación simple, económica, mantenible y
preparada para crecer, evitando complejidad innecesaria y dependencias
innecesarias de servicios externos.

La aplicación debe permitir:

- catálogo público de productos;
- carrito de compras;
- checkout como invitado;
- usuarios registrados;
- un único rol administrativo;
- gestión de productos;
- gestión de pedidos;
- integración con Mercado Pago;
- generación de links de pago;
- contenido editorial;
- deployment mediante Docker y Coolify;
- SQLite como base de datos inicial;
- migración futura a PostgreSQL.

---

# 2. Fuente de verdad

## SPEC es la fuente de verdad del proyecto.

Antes de implementar cualquier funcionalidad, el agente DEBE consultar la
especificación correspondiente dentro de `SPEC/`.

La estructura esperada es:

```text
SPEC/
├── architecture/
├── decisions/
├── operations/
├── requirements/
├── security/
└── tensting/