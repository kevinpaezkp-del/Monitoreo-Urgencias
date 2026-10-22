# Mente Estratégica · Laboratorios de digitalización

Sitio público de aprendizaje con 23 diapositivas navegables, 32 solicitudes ficticias de traslado interno, tableros calculados en el navegador y cinco prompts completos.

## Enlace de acceso
https://kevinpaezkp-del.github.io/Monitoreo-Urgencias/mente-estrategica/

## Ruta didáctica
1. Antes de esta web, presentar la PPT teórica del Módulo 4.
2. Laboratorio 1: SharePoint → Lista de 8 columnas → Crear 4 casos → Completar con 28 → Vistas por estado → Excel → HTML → Power Automate.
3. Laboratorio 2: CSV → Lista en Slack y canal → Slackbot → Superficie interactiva.

## Dataset
`base.csv` contiene 32 solicitudes ficticias, 8 columnas y fechas de cierre opcionales. En Recursos, **Descargar Excel** genera un libro `.xlsx` con la misma base, 28 filas para pegar, diccionario e instrucciones usando una biblioteca en navegador (requiere Internet). **No es idéntico en formato al libro original del docente**.

## Dashboard
- Todos los KPIs y gráficos se recalculan a partir de los registros filtrados.
- Filtros plegables y de selección múltiple, fechas desde/hasta, búsqueda y limpiar.
- Importa `.csv`, `.xlsx`, `.xls`. Para Excel se descarga una librería pública de terceros; el dashboard y la lectura CSV pueden funcionar sin esa librería.
- Promedio de duración en horas solo de Estado=Cerrado con dos fechas válidas y orden cronológico coherente.
- Informa número de cerradas válidas y casos excluidos.
- Guarda un HTML con registros actuales e interfaz autocontenida, sin indicadores fijos.
- La web está alojada en Pages en una CARPETA de un repositorio público preexistente. No modifica la aplicación de urgencias original.

## Seguridad y limitaciones
No usar información real de pacientes. El archivo importado se procesa en el navegador; cargarlo no modifica SharePoint ni Slack, ni se sincroniza con esas plataformas. Una copia del HTML guardada con datos incorporados podría revelar esos datos a quienes la reciban. No guardar datos sensibles.

Presentación HTML basada en los contenidos originales de la presentación práctica. Las diapositivas web son una adaptación visual para la navegación, no un archivo PPTX editable.

© Material educativo del curso Mente Estratégica.
