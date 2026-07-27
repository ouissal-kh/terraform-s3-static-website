provider "aws" {
	region = "us-east-1"
	# profile = "lab"
}

resource "aws_s3_bucket" "bucket" {
	bucket = "ouissal-static-portfolio-2026"
}
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.bucket.id
  key          = "index.html"
  source       = "index.html"
  content_type = "text/html"
}

resource "aws_s3_object" "css" {
  bucket       = aws_s3_bucket.bucket.id
  key          = "style.css"
  source       = "style.css"
  content_type = "text/css"
}

resource "aws_s3_object" "js" {
  bucket       = aws_s3_bucket.bucket.id
  key          = "script.js"
  source       = "script.js"
  content_type = "application/javascript"
}

resource "aws_s3_bucket_public_access_block" "public_access_block" {
  bucket = aws_s3_bucket.bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}


resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.bucket.id

  depends_on = [
    aws_s3_bucket_public_access_block.public_access_block
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.bucket.arn}/*"
      }
    ]
  })
}

output "website_url" {
  value = aws_s3_bucket_website_configuration.website.website_endpoint
}

resource "aws_s3_object" "images" {
  for_each = fileset("${path.module}/images", "**")

  bucket = aws_s3_bucket.bucket.id
  key    = "images/${each.value}"
  source = "${path.module}/images/${each.value}"

  etag = filemd5("${path.module}/images/${each.value}")

  content_type = lookup({
    jpg  = "image/jpeg"
    jpeg = "image/jpeg"
    png  = "image/png"
    webp = "image/webp"
    svg  = "image/svg+xml"
    gif  = "image/gif"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "application/octet-stream")
}