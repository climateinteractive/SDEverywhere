[@sdeverywhere/plugin-deploy](../index.md) / BuildProduct

# Interface: BuildProduct

Describes a build product that will be copied to the deployment directory.

## Properties

### displayName

 `Optional` **displayName**: `string`

The name of the build product as used in the link in the top-level index page.  If undefined,
no link will be included in the top-level index page.

___

### srcPath

 **srcPath**: `string`

The source path of the build product, relative to the project root directory (`rootDir`).

___

### dstPath

 **dstPath**: `string`

The destination path of the build product, relative to the deployment directory (`deployDir`).
