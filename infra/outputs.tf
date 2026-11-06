output "api_url" {
  description = "Base URL of the public API (no trailing slash)."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_name" {
  value = aws_lambda_function.api.function_name
}

output "rows_table" {
  value = aws_dynamodb_table.rows.name
}

output "league_table" {
  value = aws_dynamodb_table.league.name
}

output "events_table" {
  value = aws_dynamodb_table.events.name
}
