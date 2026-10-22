# Mente Estratégica · Laboratorios de digitalización

Sitio público de aprendizaje con PowerPoint original descargable (23 diapositivas editables), 32 solicitudes ficticias de traslado interno, dashboard calculado en el navegador y cinco prompts completos.

## Enlace de acceso
https://kevinpaezkp-del.github.io/Monitoreo-Urgencias/mente-estrategica/

## Ruta didáctica
1. Presentar primero la PPT teórica del Módulo 4. Descargar desde la página de Recursos el PowerPoint de los laboratorios prácticos.
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

El visor HTML adaptado se retiró. El PowerPoint editable original `Laboratorios_Guiados_Mente_Estrategica.pptx` está disponible directamente desde la página de Recursos y se genera mediante `generar-pptx.js` con GitHub Actions.

© Material educativo del curso Mente Estratégica.


## Material para estudiantes (actualización)

- El Excel descargable de Recursos conserva únicamente la hoja `02_PEGAR_28`, con 28 registros y 8 campos; los 4 primeros registros se crean manualmente durante la práctica en SharePoint.
- La sección Prompts tiene cuatro instrucciones: HTML, crear lista en Slack, generar dashboard interno desde la lista y modificar una solicitud/resumir pendientes. Se eliminó el prompt de tablas dinámicas.
- El dashboard de demostración conserva los 32 registros del ejercicio completo (4 + 28); su importación acepta bases con distinto número de filas.
