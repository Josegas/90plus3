# ============================================================
# DynamoDB — the three bottlenecks live here.
# ============================================================

# 10,000 rows. `byPlayer` is a SPARSE GSI: only rows that carry
# gsi1pk are indexed, which is exactly the point of sub 01.
resource "aws_dynamodb_table" "rows" {
  name         = "${var.project}-rows"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "byPlayer"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  tags = {
    Name = "${var.project}-rows"
  }
}

# Today's match reports. sk = run#<seconds>#<ts>#<rand>, so a plain
# Query already returns the fastest runs in order.
resource "aws_dynamodb_table" "league" {
  name         = "${var.project}-league"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = {
    Name = "${var.project}-league"
  }
}

# Live feed, counters, presence and bench aggregates.
# Everything expires: anonymous data should not live forever.
resource "aws_dynamodb_table" "events" {
  name         = "${var.project}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "expires"
    enabled        = true
  }

  tags = {
    Name = "${var.project}-events"
  }
}
