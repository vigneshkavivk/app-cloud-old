locals {
  is_user = var.create_user
  is_role = var.create_role
}

# ========== IAM USER ==========
resource "aws_iam_user" "user" {
  count = local.is_user ? 1 : 0
  name  = var.user_name
  path  = var.user_path
  tags  = merge(var.common_tags, { CreatedBy = "Terraform" })
}

resource "aws_iam_access_key" "user_key" {
  count = local.is_user && var.create_access_key ? 1 : 0
  user  = aws_iam_user.user[0].name
}

resource "aws_iam_user_policy" "user_policy" {
 count = local.is_role && var.policy_document != null && var.policy_document != "" ? 1 : 0

  name  = "${var.user_name}-policy"
  user  = aws_iam_user.user[0].name
  policy = jsonencode(jsondecode(var.policy_document))
}
# ========== IAM ROLE ==========
resource "aws_iam_role" "role" {
  count = local.is_role ? 1 : 0
  name  = var.role_name
  path  = var.role_path
  assume_role_policy = var.assume_role_policy
  tags  = merge(var.common_tags, { CreatedBy = "Terraform" })
}

resource "aws_iam_role_policy" "role_policy" {
  count = local.is_role && var.policy_document != null && var.policy_document != "" ? 1 : 0
  name  = "${var.role_name}-policy"
  role  = aws_iam_role.role[0].name
  policy = var.policy_document  # ✅ Safe because count=0 when policy is empty
}
