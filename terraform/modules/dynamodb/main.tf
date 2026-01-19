# Let AWS manage the KMS key policy (default is secure and sufficient)
resource "aws_kms_key" "dynamodb_key" {
  description             = "KMS key for DynamoDB table encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  # 🔥 NO custom policy — use AWS default (safe for DynamoDB)
  # This avoids ALL policy validation errors

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "dynamodb_key_alias" {
  name          = "alias/dynamodb-${var.dynamodb_table_name}"
  target_key_id = aws_kms_key.dynamodb_key.key_id
}

resource "aws_dynamodb_table" "file_metadata" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "file_id"

  attribute {
    name = "file_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_key.arn
  }

  tags = {
    Environment = var.environment
  }
}
