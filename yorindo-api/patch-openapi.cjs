const fs = require('fs');
let content = fs.readFileSync('openapi.yaml', 'utf8');

const templateSchemas = `    Template:
      type: object
      required: [id, name, type, channel, body, createdAt, updatedAt]
      properties:
        id:
          type: string
        name:
          type: string
        type:
          type: string
          enum: [invitation, confirmation, rejection, ticket_delivery]
        channel:
          type: string
          enum: [email, whatsapp]
        body:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
`;

const templatePaths = `  /templates:
    get:
      summary: Get all templates
      operationId: getTemplates
      responses:
        '200':
          description: List of templates
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Template'
    post:
      summary: Create template
      operationId: createTemplate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, type, channel, body]
              properties:
                name: { type: string }
                type: { type: string }
                channel: { type: string }
                body: { type: string }
      responses:
        '201':
          description: Template created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'
  /templates/{id}:
    patch:
      summary: Update template
      operationId: updateTemplate
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                type: { type: string }
                channel: { type: string }
                body: { type: string }
      responses:
        '200':
          description: Template updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'
    delete:
      summary: Delete template
      operationId: deleteTemplate
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Template deleted
  # HEALTH
`;

// Insert schemas at the end of schemas block
if (!content.includes('Template:')) {
  // We'll just replace '# ─── Event ───' with our schema + that comment
  content = content.replace('    # ─── Event ─────────────────────────────────────────────────────────────────', templateSchemas + '\n    # ─── Event ─────────────────────────────────────────────────────────────────');
  
  // Replace paths section
  content = content.replace('  # HEALTH', templatePaths);
  
  fs.writeFileSync('openapi.yaml', content);
  console.log('patched openapi.yaml');
} else {
  console.log('already patched');
}
