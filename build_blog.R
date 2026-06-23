# ==========================================================================
# Mini-Blogdown: Script de Compilación del Blog
# Impartido en R Studio para Alejandro Mosiño
# ==========================================================================

# Asegurar que rmarkdown esté instalado
if (!requireNamespace("rmarkdown", quietly = TRUE)) {
  stop("El paquete 'rmarkdown' es necesario. Por favor ejecute install.packages('rmarkdown') en la consola.")
}

# Carpetas de origen y destino (relativas a la raíz del proyecto)
src_dir <- "blog_src"
out_dir <- normalizePath("blog", mustWork = FALSE)
template_post <- normalizePath("templates/post_template.html", mustWork = TRUE)
template_index <- normalizePath("templates/blog_index_template.html", mustWork = TRUE)

# Crear carpetas si no existen
if (!dir.exists(src_dir)) dir.create(src_dir)
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

# Encontrar posts (.Rmd y .md)
post_files <- list.files(src_dir, pattern = "\\.(Rmd|md)$", full.names = TRUE)

# Filtrar para ignorar archivos de plantilla o índice temporales
post_files <- post_files[!grepl("index", basename(post_files))]

# Función para formatear fechas en español (ej. "11 de Septiembre, 2025")
format_spanish_date <- function(date_str) {
  d <- as.Date(date_str)
  months <- c("Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
              "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre")
  day <- as.integer(format(d, "%d"))
  month_idx <- as.integer(format(d, "%m"))
  year <- format(d, "%Y")
  paste0(day, " de ", months[month_idx], ", ", year)
}

# Almacén de metadatos de los posts para construir el índice
posts_metadata <- list()

cat("Iniciando compilación de posts...\n")

for (post_file in post_files) {
  # 1. Leer Front Matter (metadatos YAML)
  meta <- rmarkdown::yaml_front_matter(post_file)
  
  # Si es borrador (draft), no lo compilamos ni agregamos al índice
  if (isTRUE(meta$draft)) {
    cat(sprintf("[-] Ignorando borrador: %s\n", basename(post_file)))
    next
  }
  
  # 2. Definir nombres de salida
  html_name <- gsub("\\.(Rmd|md)$", ".html", basename(post_file))
  html_name <- tolower(html_name) # Nombres de archivo en minúsculas por convención web
  output_html_path <- file.path(out_dir, html_name)
  
  # Formatear la fecha en español para la plantilla del post
  formatted_date_span <- format_spanish_date(meta$date)
  
  # Preparar argumentos de pandoc para pasar metadatos
  pandoc_vars <- c("--metadata", paste0("date_spanish=", formatted_date_span))
  if (!is.null(meta$updated)) {
    updated_val <- meta$updated
    if (is.character(updated_val) && tolower(trimws(updated_val)) == "today") {
      updated_val <- Sys.Date()
    }
    formatted_updated_span <- format_spanish_date(updated_val)
    pandoc_vars <- c(pandoc_vars, "--metadata", paste0("updated_spanish=", formatted_updated_span))
  }
  
  # Detectar si el post es de la categoría "Opinión"
  if ("Opinión" %in% meta$categories) {
    pandoc_vars <- c(pandoc_vars, "--metadata", "opinion=true")
  }
  
  # Lógica de audio: "audio: true" o "audio: 'audio/path.mp3'" para activarlo, "audio: false" o ausente para apagarlo
  audio_enabled <- FALSE
  audio_file <- NULL
  if (!is.null(meta$audio)) {
    if (is.logical(meta$audio)) {
      if (meta$audio) {
        audio_enabled <- TRUE
      }
    } else if (is.character(meta$audio) && nchar(trimws(meta$audio)) > 0) {
      audio_enabled <- TRUE
      audio_file <- trimws(meta$audio)
    }
  }
  
  if (audio_enabled) {
    pandoc_vars <- c(pandoc_vars, "--metadata", "audio_enabled=true")
    if (!is.null(audio_file)) {
      pandoc_vars <- c(pandoc_vars, "--metadata", paste0("audio_file=", audio_file))
    }
  }
  
  # 3. Compilar post con R Markdown usando la plantilla
  cat(sprintf("[+] Compilando: %s -> %s\n", basename(post_file), html_name))
  rmarkdown::render(
    input = post_file,
    output_file = html_name,
    output_dir = out_dir,
    output_format = rmarkdown::html_document(
      template = template_post,
      theme = NULL,
      highlight = NULL,
      mathjax = if (isTRUE(meta$math)) "default" else NULL,
      self_contained = FALSE,
      pandoc_args = pandoc_vars
    ),
    quiet = TRUE
  )
  
  # 4. Extraer o autogenerar extracto si no existe
  excerpt <- meta$excerpt
  if (is.null(excerpt)) {
    # Lee las primeras líneas de texto limpio si no se especificó un extracto
    lines <- readLines(post_file, warn = FALSE)
    # Ignora el YAML inicial
    yaml_lines <- which(lines == "---")
    if (length(yaml_lines) >= 2) {
      body_lines <- lines[(yaml_lines[2] + 1):length(lines)]
    } else {
      body_lines <- lines
    }
    # Filtra líneas vacías o de cabeceras de HTML/Markdown
    body_text <- paste(body_lines[!grepl("^#|^<|^$", body_lines)], collapse = " ")
    excerpt <- paste0(substr(body_text, 1, 150), "...")
  }
  
  # 5. Guardar metadatos para el índice
  posts_metadata[[length(posts_metadata) + 1]] <- list(
    title = meta$title,
    date = as.Date(meta$date),
    categories = if (is.null(meta$categories)) "Opinión" else meta$categories,
    excerpt = excerpt,
    url = html_name
  )
}

# 6. Generar el Índice del Blog (index.html)
if (length(posts_metadata) > 0) {
  cat("\nGenerando índice del blog (index.html)...\n")
  
  # Ordenar posts por fecha descendente
  order_idx <- order(sapply(posts_metadata, function(x) x$date), decreasing = TRUE)
  sorted_posts <- posts_metadata[order_idx]
  
  # Crear las tarjetas de blog en HTML
  cards_html <- c()
  for (post in sorted_posts) {
    category_list <- paste(post$categories, collapse = ", ")
    formatted_date <- format_spanish_date(post$date)
    
    card <- paste0(
      '        <!-- Blog Card -->\n',
      '        <article class="blog-card">\n',
      '          <div class="blog-card-meta">\n',
      '            <span class="blog-card-category">', category_list, '</span>\n',
      '            <span>·</span>\n',
      '            <time datetime="', post$date, '">', formatted_date, '</time>\n',
      '          </div>\n',
      '          <h2 class="blog-card-title">\n',
      '            <a href="', post$url, '">', post$title, '</a>\n',
      '          </h2>\n',
      '          <p class="blog-card-excerpt">\n',
      '            ', post$excerpt, '\n',
      '          </p>\n',
      '          <div class="blog-card-more">\n',
      '            <a href="', post$url, '" class="item-link">Leer artículo completo &rarr;</a>\n',
      '          </div>\n',
      '        </article>\n'
    )
    cards_html <- c(cards_html, card)
  }
  
  # Combinar todo el HTML de las tarjetas
  all_cards_html <- paste(cards_html, collapse = "\n")
  
  # Leer plantilla del índice y reemplazar el placeholder
  index_template_content <- readLines(template_index, warn = FALSE)
  index_template_content <- paste(index_template_content, collapse = "\n")
  
  final_index_content <- gsub("<!-- BLOG_POSTS_PLACEHOLDER -->", all_cards_html, index_template_content)
  
  # Guardar index.html definitivo
  writeLines(final_index_content, file.path(out_dir, "index.html"), useBytes = TRUE)
  cat("[+] index.html regenerado de forma cronológica.\n")
} else {
  cat("\n[!] No se encontraron posts activos (no borradores) para generar el índice.\n")
}

cat("\nCompilación finalizada con éxito. ¡Listo para visualizar!\n")
