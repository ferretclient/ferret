const initialCollectionStructure = [
  {
    name: 'folder_1',
    type: 'folder',
    files: [
      {
        name: 'file_1.fer',
        type: 'file',
        content: 'file_1_content'
      },
      {
        name: 'file_2.fer',
        type: 'file',
        content: 'file_2_content'
      },
      {
        name: 'folder_1_1',
        type: 'folder',
        files: [
          {
            name: 'file_1_1.fer',
            type: 'file',
            content: 'file_1_1_content'
          },
          {
            name: 'file_1_2.fer',
            type: 'file',
            content: 'file_1_2_content'
          }
        ]
      },
      {
        name: 'file_1_3.fer',
        type: 'file',
        content: 'file_1_3_content'
      },
      {
        name: 'file_dup.fer',
        type: 'file',
        content: 'file_dup_content'
      }
    ]
  },
  {
    name: 'folder_2',
    type: 'folder',
    files: [
      {
        name: 'file_2_1.fer',
        type: 'file',
        content: 'file_2_1_content'
      },
      {
        name: 'file_2_2.fer',
        type: 'file',
        content: 'file_2_2_content'
      },
      {
        name: 'folder_2_1',
        type: 'folder',
        files: [
          {
            name: 'file_2_1_1.fer',
            type: 'file',
            content: 'file_2_1_1_content'
          }
        ]
      }
    ]
  },
  {
    name: 'file_dup.fer',
    type: 'file',
    content: 'file_dup_content'
  }
];

const finalCollectionStructure = [
  {
    name: 'folder_1',
    type: 'folder',
    files: [
      {
        name: 'file_1.fer',
        type: 'file',
        content: 'file_1_content'
      },
      {
        name: 'folder_1_1',
        type: 'folder',
        files: [
          {
            name: 'file_1_1.fer',
            type: 'file',
            content: 'file_1_1_content'
          },
          {
            name: 'file_1_2.fer',
            type: 'file',
            content: 'file_1_2_content'
          },
          {
            name: 'file_2.fer',
            type: 'file',
            content: 'file_2_content'
          },
          {
            name: 'folder_2',
            type: 'folder',
            files: [
              {
                name: 'file_2_1.fer',
                type: 'file',
                content: 'file_2_1_content'
              }
            ]
          }
        ]
      },
      {
        name: 'file_1_3.fer',
        type: 'file',
        content: 'file_1_3_content'
      },
      {
        name: 'file_2_2.fer',
        type: 'file',
        content: 'file_2_2_content'
      },
      {
        name: 'file_dup.fer',
        type: 'file',
        content: 'file_dup_content'
      }
    ]
  },
  {
    name: 'folder_2_1',
    type: 'folder',
    files: [
      {
        name: 'file_2_1_1.fer',
        type: 'file',
        content: 'file_2_1_1_content'
      }
    ]
  },
  {
    name: 'file_dup.fer',
    type: 'file',
    content: 'file_dup_content'
  }
];

module.exports = { initialCollectionStructure, finalCollectionStructure };
