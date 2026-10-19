import { AppError, readJson, withApiErrors } from "@/lib/api-response";
import { archiveModelField, updateModelField } from "@/lib/products/model-field-service";

type RouteContext = { params: Promise<{ fieldId: string }> };

function validateId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError("INVALID_ID", "字段编号无效。", 422);
  }
  return id;
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { fieldId } = await context.params;
    return updateModelField(validateId(fieldId), await readJson(request));
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { fieldId } = await context.params;
    return archiveModelField(validateId(fieldId));
  });
}
